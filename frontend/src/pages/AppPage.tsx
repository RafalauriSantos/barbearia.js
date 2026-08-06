import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { AppointmentsList } from "@/components/AppointmentsList";
import { BottomNav } from "@/components/BottomNav";
import { IconButton, LoadingCard, Notice } from "@/components/ScreenPrimitives";
import {
	deleteAppointment,
	formatCurrency,
	formatDateDisplay,
	formatDayKey,
	getCachedAppointmentsForDay,
	getCachedBarbers,
	getCachedDaySummaryFromAppointments,
	getCachedPaymentMethods,
	getCachedProducts,
	getCachedProfile,
	getCachedServices,
	getAppointmentsForDayWithFilters,
	getDaySummaryFromAppointments,
	isToday,
	loadProducts,
	loadServices,
	loadBarbers,
	loadPaymentMethods,
	loadProfile,
	updateAppointment,
} from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import {
	markStartupMetric,
	measureStartupMetric,
} from "@/lib/startupMetrics";
import { useNavigate } from "react-router-dom";
const SLOT_START_MINUTES = 9 * 60;
const SLOT_END_MINUTES = 20 * 60;
const SLOT_STEP_MINUTES = 30;
const AVATAR_COLORS = [
	"#0f766e",
	"#1e3a8a",
	"#7f1d1d",
	"#155e75",
	"#4c1d95",
	"#0f172a",
];
const EMPTY_SUMMARY = {
	totalReceived: 0,
	totalClients: 0,
	totalIncome: 0,
	totalExpenses: 0,
	paid: 0,
	pending: 0,
	toCollect: 0,
	overdue: 0,
};

function scheduleIdleTask(callback: () => void) {
	if (typeof window !== "undefined" && "requestIdleCallback" in window) {
		const id = (window as any).requestIdleCallback(callback, { timeout: 1500 });
		return () => (window as any).cancelIdleCallback?.(id);
	}
	const id = setTimeout(callback, 0);
	return () => clearTimeout(id);
}

function toTimeLabel(totalMinutes: number): string {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatFiadoLabel(prazoDate?: string | null): string {
	if (!prazoDate) return "";
	const prazo = new Date(prazoDate + "T12:00:00");
	const day = prazo.getDate();
	const month = prazo.getMonth() + 1;
	return `${day}/${month}`;
}

function getAppointmentSummary(appointment: any): string {
	const services =
		Array.isArray(appointment.services) ? appointment.services : [];
	const products =
		Array.isArray(appointment.products) ? appointment.products : [];
	const serviceNames = services.map((item: any) => item.name).filter(Boolean);
	const productNames = products
		.map((item: any) =>
			item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name,
		)
		.filter(Boolean);
	const names = [...serviceNames, ...productNames].filter(Boolean);
	if (names.length > 0) return names.join(", ");
	return appointment.service_name || "Atendimento";
}

function getInitials(name?: string | null): string {
	const trimmed = String(name || "").trim();
	if (!trimmed) return "?";
	const parts = trimmed.split(/\s+/).filter(Boolean);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function getAvatarColor(index: number): string {
	return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function normalizeText(value?: string | null): string {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function isOwnBarber(barber?: any, user?: any): boolean {
	if (!barber || !user) return false;

	if (user.barbeiro_id && barber.id === user.barbeiro_id) return true;
	if (user.id && barber.usuario_id === user.id) return true;
	if (user.id && barber.id === user.id) return true;

	const barberEmail = normalizeText(barber.email);
	const userEmail = normalizeText(user.email);
	if (barberEmail && userEmail && barberEmail === userEmail) return true;

	const barberName = normalizeText(barber.name || barber.nome);
	const userName = normalizeText(user.nome || user.name);
	return Boolean(barberName && userName && barberName === userName);
}

function getDefaultTimeSlot() {
	const now = new Date();
	const nowMinutes = now.getHours() * 60 + now.getMinutes();
	const roundedMinutes =
		Math.ceil(nowMinutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
	const clampedMinutes = Math.min(
		Math.max(roundedMinutes, SLOT_START_MINUTES),
		SLOT_END_MINUTES,
	);
	return toTimeLabel(clampedMinutes);
}
function PaymentQuickSheet({
	appointment,
	methods,
	isLoading,
	isSaving,
	onClose,
	onConfirm,
}: any) {
	const availableMethods = methods.filter((method: any) => method.code !== "fiado");
	const initialMethod =
		availableMethods.find((method: any) => method.id === appointment.payment_method_id) ||
		availableMethods.find((method: any) => method.code === "pix") ||
		availableMethods[0] ||
		null;
	const [selectedMethodId, setSelectedMethodId] = useState(
		initialMethod?.id || "",
	);
	const [paymentDate, setPaymentDate] = useState(formatDayKey(new Date()));
	const selectedMethod =
		availableMethods.find((method: any) => method.id === selectedMethodId) ||
		initialMethod;
	const gross = Number(appointment.value || 0);
	const feePercent = Number(selectedMethod?.fee_percent || 0);
	const feeValue =
		Math.round(((gross * feePercent) / 100 + Number.EPSILON) * 100) / 100;
	const netValue =
		Math.round((Math.max(gross - feeValue, 0) + Number.EPSILON) * 100) / 100;

	const containerRef = useFocusTrap(onClose);

	useEffect(() => {
		setSelectedMethodId(initialMethod?.id || "");
		setPaymentDate(formatDayKey(new Date()));
	}, [appointment.id, initialMethod?.id]);

	return (
		<div
			className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-sm"
			onClick={onClose}>
			<div
				ref={containerRef}
				tabIndex={-1}
				className="w-full max-w-[480px] rounded-t-lg border-x border-t border-border bg-background p-4 shadow-[0_-20px_80px_rgba(0,0,0,0.45)] outline-none"
				onClick={(event) => event.stopPropagation()}>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="font-client text-xs font-semibold text-paid">
							Receber atendimento
						</p>
						<h2 className="mt-1 truncate font-logo text-lg text-foreground">
							{appointment.client_name}
						</h2>
						<p className="mt-1 font-client text-sm text-foreground-faint">
							{formatCurrency(gross)} · {appointment.time_slot}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="h-11 w-11 flex items-center justify-center text-lg shrink-0 rounded-md border border-border bg-card text-foreground-faint">
						×
					</button>
				</div>

				{isLoading && availableMethods.length === 0 ?
					<p className="mt-4 rounded-md border border-border bg-card px-3 py-3 font-client text-xs text-foreground-faint">
						Carregando formas...
					</p>
				:	<>
						<div className="mt-4 grid grid-cols-2 gap-2">
							{availableMethods.map((method: any, index: number) => {
								const isActive = method.id === selectedMethod?.id;
								const fillsLastRow =
									availableMethods.length % 2 === 1 &&
									index === availableMethods.length - 1;
								return (
									<button
										key={method.id}
										type="button"
										onClick={() => setSelectedMethodId(method.id)}
										disabled={isSaving}
										className={`min-h-[58px] rounded-lg border px-3 py-2 text-left transition-colors ${
											isActive ?
												"border-paid/50 bg-paid/15 text-foreground"
											:	"border-border bg-card text-foreground-faint hover:border-paid/30"
										} ${fillsLastRow ? "col-span-2" : ""}`}>
										<span className="block truncate font-client text-sm font-semibold">
											{method.name}
										</span>
										<span className="mt-1 block font-mono-ui text-[10px]">
											{Number(method.fee_percent || 0).toFixed(2)}% taxa
										</span>
									</button>
								);
							})}
						</div>

						<div className="mt-4 grid grid-cols-3 gap-2">
							<div className="rounded-md bg-background-deep px-3 py-2">
								<p className="font-client text-[10px] font-semibold text-foreground-faint">
									Bruto
								</p>
								<p className="mt-1 font-value text-base text-foreground">
									{formatCurrency(gross)}
								</p>
							</div>
							<div className="rounded-md bg-background-deep px-3 py-2">
								<p className="font-client text-[10px] font-semibold text-foreground-faint">
									Taxa
								</p>
								<p className="mt-1 font-value text-base text-fiado">
									{formatCurrency(feeValue)}
								</p>
							</div>
							<div className="rounded-md bg-background-deep px-3 py-2">
								<p className="font-client text-[10px] font-semibold text-foreground-faint">
									Líquido
								</p>
								<p className="mt-1 font-value text-base text-paid">
									{formatCurrency(netValue)}
								</p>
							</div>
						</div>
						<label className="mt-3 block">
							<span className="mb-1 block font-client text-xs font-semibold text-foreground-faint">
								Data do pagamento
							</span>
							<input
								type="date"
								value={paymentDate}
								onChange={(event) => setPaymentDate(event.target.value)}
								className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
								disabled={isSaving}
							/>
						</label>

						<button
							type="button"
							onClick={() => selectedMethod && onConfirm(selectedMethod, paymentDate)}
							disabled={isSaving || !selectedMethod}
							className="mt-4 w-full rounded-lg bg-paid px-4 py-3 font-client text-xs font-bold uppercase text-primary-foreground transition-transform active:scale-[0.99] disabled:opacity-60">
							{isSaving ? "Salvando..." : "Confirmar pagamento"}
						</button>
					</>
				}
			</div>
		</div>
	);
}

export default function AppPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";
	const initialCacheRef = useRef<any>(null);
	if (!initialCacheRef.current) {
		const initialDayKey = formatDayKey(new Date());
		const initialOwnBarberId = user?.barbeiro_id || "";
		const initialAppointmentFilters =
			initialOwnBarberId ? { barbeiro_id: initialOwnBarberId } : {};
		const cachedAppointments = getCachedAppointmentsForDay(
			initialDayKey,
			initialAppointmentFilters,
		);
		initialCacheRef.current = {
			dayKey: initialDayKey,
			appointments: cachedAppointments,
			profile: getCachedProfile(),
			barbers: getCachedBarbers(),
			services: getCachedServices(),
			products: getCachedProducts(),
			paymentMethods: getCachedPaymentMethods(),
		};
	}
	const initialCache = initialCacheRef.current || {
		dayKey: formatDayKey(new Date()),
		appointments: [],
		profile: null,
		barbers: [],
		services: [],
		products: [],
		paymentMethods: [],
	};
	const [currentDate, setCurrentDate] = useState(new Date());
	const [appointments, setAppointments] = useState(
		initialCache.appointments || [],
	);
	const [summary, setSummary] = useState(
		getCachedDaySummaryFromAppointments(
			initialCache.dayKey,
			initialCache.appointments || [],
		) || EMPTY_SUMMARY,
	);
	const [isLoading, setIsLoading] = useState(!initialCache.appointments);
	const hasLoadedRef = useRef(Boolean(initialCache.appointments));
	const startupReloadRef = useRef(true);
	const [dashboardReady, setDashboardReady] = useState(
		Boolean(initialCache.appointments),
	);
	const [errorMessage, setErrorMessage] = useState("");
	const [feedbackMessage, setFeedbackMessage] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingAppt, setEditingAppt] = useState<any>(undefined);
	const [defaultTimeSlot, setDefaultTimeSlot] = useState("09:00");
	const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
	const selectedAppointmentRef = useFocusTrap(() => setSelectedAppointment(null), !!selectedAppointment);
	const [services, setServices] = useState<any[]>(initialCache.services || []);
	const [products, setProducts] = useState<any[]>(initialCache.products || []);
	const [paymentMethods, setPaymentMethods] = useState<any[]>(
		initialCache.paymentMethods || [],
	);
	const [isLoadingCatalog, setIsLoadingCatalog] = useState(
		!(initialCache.services && initialCache.products),
	);
	const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(
		!initialCache.paymentMethods,
	);
	const [itemDraft, setItemDraft] = useState<{ services: any[]; products: any[] }>({ services: [], products: [] });
	const [autoValueForDraft, setAutoValueForDraft] = useState(true);
	const [isSavingItems, setIsSavingItems] = useState(false);
	const [itemError, setItemError] = useState("");
	const [barbers, setBarbers] = useState<any[]>(initialCache.barbers || []);
	const [profile, setProfile] = useState<any>(initialCache.profile || null);
	const [activeBarberId, setActiveBarberId] = useState("");
	const [savingStatusId, setSavingStatusId] = useState("");
	const [paymentAppointment, setPaymentAppointment] = useState<any>(null);
	const appointmentsRef = useRef(appointments);
	const savingStatusIdRef = useRef(savingStatusId);
	const catalogRequestRef = useRef<Promise<any> | null>(null);
	const paymentMethodsRequestRef = useRef<Promise<any> | null>(null);
	const catalogLoadedRef = useRef(
		Boolean(initialCache.services && initialCache.products),
	);
	const paymentMethodsLoadedRef = useRef(Boolean(initialCache.paymentMethods));
	const mountedRef = useRef(true);
	const appPageStartMarkedRef = useRef(false);
	const dayKey = formatDayKey(currentDate);
	const ownBarberId = user?.barbeiro_id || "";
	const selectedBarberId = activeBarberId || ownBarberId || "";

	appointmentsRef.current = appointments;
	savingStatusIdRef.current = savingStatusId;

	if (!appPageStartMarkedRef.current) {
		appPageStartMarkedRef.current = true;
		markStartupMetric("app-page:start", { route: "/app" });
	}

	const barberOptions = useMemo(() => {
		if (!isAdmin) return [];
		return barbers
			.filter((barber) => !isOwnBarber(barber, user))
			.map((barber, index) => ({
				...barber,
				photo_url: barber.photo_url || barber.foto_url || null,
				color: getAvatarColor(index),
			}));
	}, [barbers, isAdmin, user]);
	const activeExternalBarber = useMemo(
		() => barberOptions.find((barber) => barber.id === activeBarberId) || null,
		[activeBarberId, barberOptions],
	);
	const ownAgendaName = profile?.barberName || user?.nome || "Minha agenda";
	const ownAgendaPhotoUrl = profile?.barberPhotoUrl || profile?.photo_url || "";
	const activeAgendaName =
		activeExternalBarber ?
			activeExternalBarber.name || activeExternalBarber.nome
		:	ownAgendaName;
	const activeAgendaPhotoUrl =
		activeExternalBarber ?
			activeExternalBarber.photo_url || activeExternalBarber.foto_url
		:	ownAgendaPhotoUrl;
	const agendaSubtitle =
		activeExternalBarber ?
			`agenda de ${activeExternalBarber.name || activeExternalBarber.nome}`
		:	"sua agenda";
	const todaySelected = isToday(currentDate);
	const sortedAppointments = useMemo(() => {
		return [...appointments].sort((first, second) =>
			String(first.time_slot || "").localeCompare(
				String(second.time_slot || ""),
			),
		);
	}, [appointments]);

	useEffect(() => {
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const ensureCatalogLoaded = useCallback(() => {
		if (catalogLoadedRef.current) return Promise.resolve();
		if (catalogRequestRef.current) return catalogRequestRef.current;

		markStartupMetric("background:catalog:start");
		setIsLoadingCatalog(true);
		catalogRequestRef.current = Promise.all([
			loadServices({ force: false }),
			loadProducts({ force: false }),
		])
			.then(([serviceList, productList]) => {
				if (mountedRef.current) {
					setServices(serviceList);
					setProducts(productList);
				}
				catalogLoadedRef.current = true;
				markStartupMetric("background:catalog:end", {
					status: "success",
				});
				measureStartupMetric(
					"background:catalog",
					"background:catalog:start",
					"background:catalog:end",
					{ status: "success" },
				);
			})
			.catch(() => {
				if (
					mountedRef.current &&
					!(initialCache.services && initialCache.products)
				) {
					setServices([]);
					setProducts([]);
				}
				markStartupMetric("background:catalog:end", {
					status: "error",
				});
				measureStartupMetric(
					"background:catalog",
					"background:catalog:start",
					"background:catalog:end",
					{ status: "error" },
				);
			})
			.finally(() => {
				catalogRequestRef.current = null;
				if (mountedRef.current) {
					setIsLoadingCatalog(false);
				}
			});

		return catalogRequestRef.current;
	}, [initialCache.products, initialCache.services]);

	const ensurePaymentMethodsLoaded = useCallback(() => {
		if (paymentMethodsLoadedRef.current) return Promise.resolve();
		if (paymentMethodsRequestRef.current) return paymentMethodsRequestRef.current;

		markStartupMetric("background:payment-methods:start");
		setIsLoadingPaymentMethods(true);
		paymentMethodsRequestRef.current = loadPaymentMethods({ force: false })
			.then((list) => {
				if (mountedRef.current) setPaymentMethods(list);
				paymentMethodsLoadedRef.current = true;
				markStartupMetric("background:payment-methods:end", {
					status: "success",
				});
				measureStartupMetric(
					"background:payment-methods",
					"background:payment-methods:start",
					"background:payment-methods:end",
					{ status: "success" },
				);
			})
			.catch(() => {
				if (mountedRef.current && !initialCache.paymentMethods) {
					setPaymentMethods([]);
				}
				markStartupMetric("background:payment-methods:end", {
					status: "error",
				});
				measureStartupMetric(
					"background:payment-methods",
					"background:payment-methods:start",
					"background:payment-methods:end",
					{ status: "error" },
				);
			})
			.finally(() => {
				paymentMethodsRequestRef.current = null;
				if (mountedRef.current) setIsLoadingPaymentMethods(false);
			});

		return paymentMethodsRequestRef.current;
	}, [initialCache.paymentMethods]);

	useEffect(() => {
		loadProfile({ force: false })
			.then((data) => setProfile(data || {}))
			.catch(() => {
				if (!initialCache.profile) setProfile({});
			});
	}, [initialCache.profile]);

	useEffect(() => {
		if (!isAdmin) return;
		loadBarbers({ force: false })
			.then((list) => {
				setBarbers(list);
				setActiveBarberId((current) => {
					const availableIds = new Set(
						list
							.filter((barber: any) => !isOwnBarber(barber, user))
							.map((barber: any) => barber.id),
					);
					if (current && availableIds.has(current)) return current;
					return "";
				});
			})
			.catch((error: any) => {
				if (!initialCache.barbers) setBarbers([]);
				setErrorMessage(error?.message || "Falha ao carregar barbeiros.");
			});
	}, [initialCache.barbers, isAdmin, user]);

	const reload = useCallback(async ({ force = true } = {}) => {
		const hasLoaded = hasLoadedRef.current;
		setIsLoading(!hasLoaded);
		setErrorMessage("");
		try {
			const params = selectedBarberId ? { barbeiro_id: selectedBarberId } : {};
			const list = await getAppointmentsForDayWithFilters(dayKey, params, {
				force,
			});
			setAppointments(list);
			const nextSummary = await getDaySummaryFromAppointments(dayKey, list, {
				force,
			});
			setSummary(nextSummary);
		} catch (error: any) {
			if (!hasLoaded) {
				setAppointments([]);
				setSummary(EMPTY_SUMMARY);
			}
			setErrorMessage(
				error?.message || "Falha ao carregar os agendamentos do dia.",
			);
		} finally {
			setIsLoading(false);
			hasLoadedRef.current = true;
			setDashboardReady(true);
		}
	}, [dayKey, selectedBarberId]);

	useEffect(() => {
		const force = !startupReloadRef.current;
		startupReloadRef.current = false;
		reload({ force });
	}, [reload]);

	useEffect(() => {
		if (!dashboardReady) return undefined;
		return scheduleIdleTask(() => {
			void ensureCatalogLoaded();
			void ensurePaymentMethodsLoaded();
		});
	}, [dashboardReady, ensureCatalogLoaded, ensurePaymentMethodsLoaded]);

	const prevDay = () => {
		const next = new Date(currentDate);
		next.setDate(next.getDate() - 1);
		setCurrentDate(next);
	};

	const nextDay = () => {
		const next = new Date(currentDate);
		next.setDate(next.getDate() + 1);
		setCurrentDate(next);
	};

	const openNewAppointment = useCallback(() => {
		if (isAdmin && !selectedBarberId) {
			setFeedbackMessage("Selecione uma agenda antes de adicionar cliente.");
			return;
		}
		setEditingAppt(undefined);
		setDefaultTimeSlot(todaySelected ? getDefaultTimeSlot() : "09:00");
		setDialogOpen(true);
		setFeedbackMessage("");
	}, [isAdmin, selectedBarberId, todaySelected]);

	const openDetails = (appointment: any) => {
		setSelectedAppointment(null);
		setEditingAppt(appointment);
		setDefaultTimeSlot(appointment.time_slot || "09:00");
		setDialogOpen(true);
	};

	const openQuickItems = useCallback((appointment: any) => {
		void ensureCatalogLoaded();
		const servicesDraft =
			Array.isArray(appointment.services) ? appointment.services : [];
		const productsDraft =
			Array.isArray(appointment.products) ? appointment.products : [];
		const itemsTotal = [...servicesDraft, ...productsDraft].reduce(
			(sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1),
			0,
		);
		const delta = Math.abs(Number(appointment.value || 0) - itemsTotal);
		setAutoValueForDraft(delta < 0.01 || Number(appointment.value || 0) === 0);
		setItemDraft({ services: servicesDraft, products: productsDraft });
		setItemError("");
		setSelectedAppointment(appointment);
	}, [ensureCatalogLoaded]);

	const updateDraftQuantity = (type: "services" | "products", id: string, quantity: number) => {
		setItemDraft((prev) => ({
			...prev,
			[type]: prev[type].map((item: any) =>
				item.id === id ? { ...item, quantity } : item,
			),
		}));
	};

	const removeDraftItem = (type: "services" | "products", id: string) => {
		setItemDraft((prev) => ({
			...prev,
			[type]: prev[type].filter((item: any) => item.id !== id),
		}));
	};

	const addDraftItem = (type: "services" | "products", item: any) => {
		setItemDraft((prev) => {
			const list = prev[type];
			const existing = list.find((entry: any) => entry.id === item.id);
			if (!existing) {
				const nextItem = {
					id: item.id,
					name: item.name,
					price: item.price,
					quantity: 1,
					...(type === "products" ?
						{
							purchase_type: item.purchase_type || "avista",
							cost_price: Number(item.cost_price || 0),
							supplier_name: item.supplier_name || "",
							seller_commission_percent: Number(
								item.seller_commission_percent || 0,
							),
						}
					:	{}),
				};
				return {
					...prev,
					[type]: [...list, nextItem],
				};
			}
			return {
				...prev,
				[type]: list.map((entry: any) =>
					entry.id === item.id ?
						{ ...entry, quantity: Number(entry.quantity || 1) + 1 }
					:	entry,
				),
			};
		});
	};

	const draftTotal = [...itemDraft.services, ...itemDraft.products].reduce(
		(sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1),
		0,
	);

	const saveDraftItems = async () => {
		if (!selectedAppointment || isSavingItems) return;
		setIsSavingItems(true);
		setItemError("");
		try {
			const payload: any = {
				services: itemDraft.services,
				products: itemDraft.products,
			};
			if (autoValueForDraft) {
				payload.value = draftTotal;
			} else {
				payload.value = Number(selectedAppointment.value || 0);
			}
			const updated = await updateAppointment(selectedAppointment.id, payload);
			setSelectedAppointment(updated);
			setItemDraft({
				services: Array.isArray(updated.services) ? updated.services : [],
				products: Array.isArray(updated.products) ? updated.products : [],
			});
			await reload();
		} catch (error: any) {
			setItemError(error?.message || "Falha ao atualizar itens.");
		} finally {
			setIsSavingItems(false);
		}
	};

	const removeAppointment = async (appointment: any) => {
		if (!window.confirm("Remover este cliente da agenda?")) return;
		setSelectedAppointment(null);
		setErrorMessage("");
		try {
			await deleteAppointment(appointment.id);
			await reload();
		} catch (error: any) {
			setErrorMessage(error?.message || "Nao foi possivel remover cliente.");
		}
	};

	const changeAppointmentStatusBySwipe = useCallback(
		async (appointment: any, status: any) => {
		if (status === "paid") {
			void ensurePaymentMethodsLoaded();
			setPaymentAppointment(appointment);
			setFeedbackMessage("");
			return;
		}
		if (savingStatusIdRef.current || appointment.status === status) return;
		savingStatusIdRef.current = appointment.id;
		setSavingStatusId(appointment.id);
		setFeedbackMessage("");
		setErrorMessage("");
		const previousAppointments = appointmentsRef.current;
		const optimisticAppointment = {
			...appointment,
			status,
			prazo_date: status === "fiado" ? appointment.prazo_date || null : null,
		};
		setAppointments((current: any[]) => {
			const nextAppointments = current.map((item: any) =>
				item.id === appointment.id ? optimisticAppointment : item,
			);
			appointmentsRef.current = nextAppointments;
			return nextAppointments;
		});
		try {
			await updateAppointment(appointment.id, {
				status,
				prazo_date:
					status === "fiado" ? appointment.prazo_date || null : null,
			});
			savingStatusIdRef.current = "";
			setSavingStatusId("");
			await reload();
		} catch (error) {
			appointmentsRef.current = previousAppointments;
			setAppointments(previousAppointments);
			setErrorMessage((error as any)?.message || "Nao foi possivel atualizar o status.");
		} finally {
			savingStatusIdRef.current = "";
			setSavingStatusId("");
		}
	}, [ensurePaymentMethodsLoaded, reload]);

	const confirmAppointmentPayment = async (method: any, paymentDate: string) => {
		if (!paymentAppointment || savingStatusId) return;
		const appointment = paymentAppointment;
		const previousAppointments = appointments;
		const grossValue = Number(appointment.value || 0);
		const feePercent = Number(method.fee_percent || 0);
		const feeValue =
			Math.round(((grossValue * feePercent) / 100 + Number.EPSILON) * 100) /
			100;
		const optimisticAppointment = {
			...appointment,
			status: "paid",
			payment_method_id: method.id,
			payment_method_code: method.code,
			payment_method_name: method.name,
			payment_date: paymentDate,
			forma_pagamento_id: method.id,
			forma_pagamento: method.code,
			payment_fee_percent: feePercent,
			payment_fee_value: feeValue,
			net_value: Math.max(grossValue - feeValue, 0),
			prazo_date: null,
		};

		setSavingStatusId(appointment.id);
		setPaymentAppointment(null);
		setFeedbackMessage("");
		setErrorMessage("");
		setAppointments((current: any[]) =>
			current.map((item: any) =>
				item.id === appointment.id ? optimisticAppointment : item,
			),
		);
		try {
			const updated = await updateAppointment(appointment.id, {
				status: "paid",
				payment_method_id: method.id,
				payment_date: paymentDate,
				prazo_date: null,
			});
			setAppointments((current: any[]) =>
				current.map((item: any) =>
					item.id === updated.id ? updated : item,
				),
			);
			reload();
		} catch (error) {
			setAppointments(previousAppointments);
			setErrorMessage((error as any)?.message || "Nao foi possivel receber pagamento.");
		} finally {
			setSavingStatusId("");
		}
	};

	const shopName = profile?.shopName || "Marque's";

	return (
		<div className="wrap flex flex-col h-[var(--app-height)] max-h-[var(--app-height)] bg-[var(--bg)] text-[var(--white)] overflow-hidden">
			<header className="agenda-header">
				<div className="flex items-center justify-between">
					<div className="profile">
						<div className="avatar-agenda overflow-hidden">
							{activeAgendaPhotoUrl ?
								<img
									src={activeAgendaPhotoUrl}
									alt={activeAgendaName}
									className="h-full w-full object-cover rounded-full"
								/>
							:	<span>{getInitials(activeAgendaName)}</span>}
						</div>
						<div>
							<div className="profile-name">{activeAgendaName}</div>
							<p className="sr-only">{agendaSubtitle}</p>
							<div className="profile-shop">{shopName}</div>
						</div>
					</div>
					<IconButton
						label="Configurações"
						onClick={() => navigate("/settings")}
						className="h-8 w-8 text-[var(--gray)] hover:text-[var(--white)]">
						⚙
					</IconButton>
				</div>

				{barberOptions.length > 0 && (
					<div className="mt-3">
						<div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
							{barberOptions.map((barber: any, index: number) => {
								const isActive = activeBarberId === barber.id;
								return (
									<button
										key={barber.id}
										type="button"
										onClick={() => {
											setActiveBarberId(barber.id);
											setFeedbackMessage("");
										}}
										className="flex shrink-0 flex-col items-center gap-1">
										<div
											className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 ${
												isActive ? "border-[var(--green)]" : "border-transparent"
											}`}
											style={{
												background: barber.color || getAvatarColor(index),
											}}>
											{barber.photo_url ?
												<img
													src={barber.photo_url}
													alt={barber.name}
													className="h-full w-full object-cover"
												/>
											:	<span className="text-[10px] font-semibold text-white">
													{getInitials(barber.name || barber.nome)}
												</span>
											}
										</div>
										<span
											className={`max-w-[52px] truncate text-[8px] ${
												isActive ? "text-[var(--green)]" : "text-[var(--gray)]"
											}`}>
											{barber.name || barber.nome}
										</span>
									</button>
								);
							})}
							{activeExternalBarber && (
								<button
									type="button"
									onClick={() => {
										setActiveBarberId("");
										setFeedbackMessage("");
									}}
									className="mt-0.5 flex h-9 shrink-0 items-center rounded-full border border-[#14532d]/80 bg-[#052e1b] px-3 font-mono-ui text-[10px] lowercase text-[var(--green)] transition-colors">
									← minha agenda
								</button>
							)}
						</div>
					</div>
				)}

				<div className="stats-card-compact stats-agenda">
					<div className="stat-agenda green">
						Recebido <b>{'\u200B'}{formatCurrency(summary.totalReceived)}</b>
					</div>
					<div className="stat-divider" />
					<div className="stat-agenda amber">
						A cobrar <b>{'\u200B'}{formatCurrency(summary.toCollect)}</b>
					</div>
				</div>

				<div className="date-row">
					<button
						type="button"
						onClick={prevDay}
						aria-label="Dia anterior"
						className="arrow-btn">
						‹
					</button>
					<div className="date-pill">
						{formatDateDisplay(currentDate)}
						{todaySelected && <span className="today-tag">hoje</span>}
					</div>
					<button
						type="button"
						onClick={nextDay}
						aria-label="Próximo dia"
						className="arrow-btn">
						›
					</button>
				</div>
			</header>

			<main className="min-h-0 flex-1 overflow-y-auto safe-bottom pb-36">
				<AppointmentsList
					appointments={sortedAppointments}
					isLoading={isLoading}
					savingStatusId={savingStatusId}
					onCreate={openNewAppointment}
					onOpen={openQuickItems}
					onStatusChange={changeAppointmentStatusBySwipe}>
					{feedbackMessage && (
						<div className="mb-3">
							<Notice tone="error">{feedbackMessage}</Notice>
						</div>
					)}
					{errorMessage && (
						<div className="mb-3">
							<Notice
								tone="error"
								title="Erro"
								action={
									<button
										type="button"
										onClick={() => reload()}
										className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground">
										Tentar novamente
									</button>
								}>
								{errorMessage}
							</Notice>
						</div>
					)}
				</AppointmentsList>
			</main>

			<BottomNav />

			{selectedAppointment && (
				<div
					className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-0 backdrop-blur-sm"
					onClick={() => setSelectedAppointment(null)}>
					<div
						ref={selectedAppointmentRef}
						tabIndex={-1}
						className="w-full max-w-[480px] rounded-t-lg border-x border-t border-border bg-background p-4 outline-none"
						onClick={(event) => event.stopPropagation()}>
						<p className="font-client text-xs font-semibold text-foreground-faint">
							{selectedAppointment.time_slot}
						</p>
						<h2 className="mt-1 truncate font-logo text-lg text-foreground">
							{selectedAppointment.client_name}
						</h2>
						<p className="mt-2 font-client text-sm text-foreground-faint">
							{getAppointmentSummary(selectedAppointment)} ·{" "}
							{formatCurrency(Number(selectedAppointment.value || 0))}
							{(
								selectedAppointment.status === "fiado" &&
								selectedAppointment.prazo_date
							) ?
								` · Fiado ate ${formatFiadoLabel(selectedAppointment.prazo_date)}`
							:	""}
						</p>
						<div className="mt-4 space-y-3">
							{itemError && <Notice tone="error">{itemError}</Notice>}
							<div className="rounded-md border border-border bg-card px-3 py-3">
								<p className="font-client text-xs font-semibold text-foreground-faint">
									Itens do atendimento
								</p>
								{(
									itemDraft.services.length === 0 &&
									itemDraft.products.length === 0
								) ?
									<p className="mt-2 font-client text-xs text-foreground-faint">
										Sem itens adicionados.
									</p>
								:	<div className="mt-2 space-y-2">
										{itemDraft.services.map((item: any) => (
											<div
												key={`service-${item.id}`}
												className="flex items-center gap-2 rounded-md border border-border bg-background-deep px-2 py-2">
												<span className="min-w-0 flex-1 truncate font-mono-ui text-[10px] text-foreground">
													{item.name}
												</span>
												<input
													type="number"
													min="1"
													value={item.quantity}
													onChange={(event) =>
														updateDraftQuantity(
															"services",
															item.id,
															Math.max(1, Number(event.target.value || 1)),
														)
													}
													className="w-16 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
												/>
												<button
													type="button"
													onClick={() => removeDraftItem("services", item.id)}
													className="rounded-md border border-overdue/40 bg-overdue/10 px-2 py-1 font-mono-ui text-[9px] text-overdue">
													remover
												</button>
											</div>
										))}
										{itemDraft.products.map((item: any) => (
											<div
												key={`product-${item.id}`}
												className="flex items-center gap-2 rounded-md border border-border bg-background-deep px-2 py-2">
												<span className="min-w-0 flex-1 truncate font-mono-ui text-[10px] text-foreground">
													{item.name}
												</span>
												<input
													type="number"
													min="1"
													value={item.quantity}
													onChange={(event) =>
														updateDraftQuantity(
															"products",
															item.id,
															Math.max(1, Number(event.target.value || 1)),
														)
													}
													className="w-16 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
												/>
												<button
													type="button"
													onClick={() => removeDraftItem("products", item.id)}
													className="rounded-md border border-overdue/40 bg-overdue/10 px-2 py-1 font-mono-ui text-[9px] text-overdue">
													remover
												</button>
											</div>
										))}
									</div>
								}
								<div className="mt-3 flex flex-wrap items-center gap-2">
									<span className="font-client text-xs text-foreground-faint">
										Total itens: {formatCurrency(draftTotal)}
									</span>
									<button
										type="button"
										onClick={() => setAutoValueForDraft(true)}
										className="rounded-md border border-border px-2 py-1 font-client text-xs text-foreground-faint">
										Usar total dos itens
									</button>
								</div>
							</div>

							<div className="rounded-md border border-border bg-card px-3 py-3">
								<p className="font-client text-xs font-semibold text-foreground-faint">
									Adicionar itens
								</p>
								{isLoadingCatalog ?
									<LoadingCard label="Carregando catálogo" rows={2} />
								:	<div className="mt-2 space-y-3">
										<div>
											<p className="mb-2 font-client text-[10px] font-semibold text-foreground-faint">
												Serviços
											</p>
											{services.length === 0 ?
												<p className="font-client text-xs text-foreground-faint">
													Nenhum serviço cadastrado.
												</p>
											:	<div className="flex flex-wrap gap-2">
													{services.map((service: any) => (
														<button
															key={service.id}
															type="button"
															onClick={() => addDraftItem("services", service)}
															className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono-ui text-[10px] text-foreground">
															{service.name} · {formatCurrency(service.price)}
														</button>
													))}
												</div>
											}
										</div>
										<div>
											<p className="mb-2 font-client text-[10px] font-semibold text-foreground-faint">
												Produtos
											</p>
											{products.length === 0 ?
												<p className="font-client text-xs text-foreground-faint">
													Nenhum produto cadastrado.
												</p>
											:	<div className="flex flex-wrap gap-2">
													{products.map((product: any) => (
														<button
															key={product.id}
															type="button"
															onClick={() => addDraftItem("products", product)}
															className="rounded-md border border-border bg-secondary px-2 py-1.5 font-mono-ui text-[10px] text-foreground">
															{product.name} · {formatCurrency(product.price)}
														</button>
													))}
												</div>
											}
										</div>
									</div>
								}
							</div>

							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => openDetails(selectedAppointment)}
									className="rounded-md border border-border bg-card px-4 py-3 font-mono-ui text-xs text-foreground">
									Ver detalhes
								</button>
								<button
									type="button"
									onClick={() => removeAppointment(selectedAppointment)}
									className="rounded-md border border-overdue/40 bg-overdue/10 px-4 py-3 font-mono-ui text-xs text-overdue">
									Remover
								</button>
							</div>
							<button
								type="button"
								onClick={saveDraftItems}
								disabled={isSavingItems}
								className="w-full rounded-md bg-foreground px-4 py-3 font-mono-ui text-xs text-primary-foreground disabled:opacity-60">
								{isSavingItems ? "Salvando..." : "Salvar itens"}
							</button>
						</div>
					</div>
				</div>
			)}

			{paymentAppointment && (
				<PaymentQuickSheet
					appointment={paymentAppointment}
					methods={paymentMethods}
					isLoading={isLoadingPaymentMethods}
					isSaving={savingStatusId === paymentAppointment.id}
					onClose={() => {
						if (!savingStatusId) setPaymentAppointment(null);
					}}
					onConfirm={confirmAppointmentPayment}
				/>
			)}

			{dialogOpen && (
				<AppointmentDialog
					dayKey={dayKey}
					appointment={editingAppt}
					barbers={barbers}
					canChooseBarber={false}
					defaultBarberId={selectedBarberId}
					forcedBarberId={selectedBarberId}
					defaultTimeSlot={defaultTimeSlot}
					onClose={() => setDialogOpen(false)}
					onSave={reload}
					onError={setErrorMessage}
				/>
			)}
		</div>
	);
}
