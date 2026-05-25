import { useCallback, useEffect, useMemo, useState } from "react";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { BottomNav } from "@/components/BottomNav";
import { IconButton, LoadingCard, Notice } from "@/components/ScreenPrimitives";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
	deleteAppointment,
	formatCurrency,
	formatDateDisplay,
	formatDayKey,
	getAppointmentsForDayWithFilters,
	getDaySummaryFromAppointments,
	isToday,
	loadBarbers,
	loadProfile,
} from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

const SLOT_START_MINUTES = 9 * 60;
const SLOT_END_MINUTES = 20 * 60;
const SLOT_STEP_MINUTES = 30;

function toTimeLabel(totalMinutes) {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeDate(date) {
	const next = new Date(date);
	next.setHours(0, 0, 0, 0);
	return next;
}

function isBeforeToday(date) {
	return normalizeDate(date) < normalizeDate(new Date());
}

function getSlots() {
	const slots = [];
	for (
		let minutes = SLOT_START_MINUTES;
		minutes <= SLOT_END_MINUTES;
		minutes += SLOT_STEP_MINUTES
	) {
		slots.push({ minutes, time: toTimeLabel(minutes) });
	}
	return slots;
}

function getStatusLabel(status) {
	if (status === "paid") return "pago";
	if (status === "fiado") return "pendente";
	return "pendente";
}

function getNowLineIndex(slots, currentDate) {
	if (!isToday(currentDate)) return -1;
	const now = new Date();
	const nowMinutes = now.getHours() * 60 + now.getMinutes();
	if (nowMinutes < SLOT_START_MINUTES || nowMinutes > SLOT_END_MINUTES) {
		return -1;
	}
	const index = slots.findIndex((slot) => slot.minutes >= nowMinutes);
	return index === -1 ? slots.length - 1 : index;
}

export default function AppPage() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [appointments, setAppointments] = useState([]);
	const [summary, setSummary] = useState({
		totalReceived: 0,
		totalClients: 0,
		totalIncome: 0,
		totalExpenses: 0,
		paid: 0,
		pending: 0,
		toCollect: 0,
		overdue: 0,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [feedbackMessage, setFeedbackMessage] = useState("");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingAppt, setEditingAppt] = useState();
	const [defaultTimeSlot, setDefaultTimeSlot] = useState("09:00");
	const [selectedAppointment, setSelectedAppointment] = useState(null);
	const [barbers, setBarbers] = useState([]);
	const [profile, setProfile] = useState(null);
	const [agendaKey, setAgendaKey] = useState("mine");
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";
	const dayKey = formatDayKey(currentDate);
	const ownBarberId = user?.barbeiro_id || "";
	const selectedBarberId = agendaKey === "mine" ? ownBarberId : agendaKey;
	const ownBarber = barbers.find((barber) => barber.id === ownBarberId);
	const teamBarbers = useMemo(
		() => barbers.filter((barber) => barber.id !== ownBarberId),
		[barbers, ownBarberId],
	);
	const selectedBarberName =
		agendaKey === "mine" ?
			ownBarber?.name || user?.nome || user?.email || "Minha agenda"
		:	barbers.find((barber) => barber.id === agendaKey)?.name || "Agenda";
	const todaySelected = isToday(currentDate);
	const canGoBack = !todaySelected;
	const slots = useMemo(() => getSlots(), []);
	const nowLineIndex = getNowLineIndex(slots, currentDate);
	const appointmentsByTime = useMemo(() => {
		const map = new Map();
		for (const appointment of appointments) {
			map.set(String(appointment.time_slot || "").slice(0, 5), appointment);
		}
		return map;
	}, [appointments]);

	useEffect(() => {
		loadProfile()
			.then((data) => setProfile(data || {}))
			.catch(() => setProfile({}));
	}, []);

	useEffect(() => {
		if (!isAdmin) return;
		if (!ownBarberId && agendaKey === "mine") {
			setAgendaKey("");
		}
	}, [agendaKey, isAdmin, ownBarberId]);

	useEffect(() => {
		if (!isAdmin) return;
		loadBarbers()
			.then((list) => {
				setBarbers(list);
				setAgendaKey((current) => {
					const availableIds = new Set(list.map((barber) => barber.id));
					if (ownBarberId) {
						if (!current || current === ownBarberId) return "mine";
						if (current === "mine" || availableIds.has(current)) return current;
						return "mine";
					}
					if (current && current !== "mine" && availableIds.has(current)) {
						return current;
					}
					return "";
				});
			})
			.catch((error) => {
				setBarbers([]);
				setErrorMessage(error.message || "Falha ao carregar barbeiros.");
			});
	}, [isAdmin, ownBarberId]);

	const reload = useCallback(async () => {
		setIsLoading(!hasLoaded);
		setErrorMessage("");
		if (!selectedBarberId) {
			setAppointments([]);
			setSummary({
				totalReceived: 0,
				totalClients: 0,
				totalIncome: 0,
				totalExpenses: 0,
				paid: 0,
				pending: 0,
				toCollect: 0,
				overdue: 0,
			});
			setIsLoading(false);
			setHasLoaded(true);
			return;
		}
		try {
			const list = await getAppointmentsForDayWithFilters(dayKey, {
				barbeiro_id: selectedBarberId,
			});
			setAppointments(list);
			const nextSummary = await getDaySummaryFromAppointments(dayKey, list);
			setSummary(nextSummary);
		} catch (error) {
			setAppointments([]);
			setSummary({
				totalReceived: 0,
				totalClients: 0,
				totalIncome: 0,
				totalExpenses: 0,
				paid: 0,
				pending: 0,
				toCollect: 0,
				overdue: 0,
			});
			setErrorMessage(
				error.message || "Falha ao carregar os agendamentos do dia.",
			);
		} finally {
			setIsLoading(false);
			setHasLoaded(true);
		}
	}, [dayKey, hasLoaded, selectedBarberId]);

	useEffect(() => {
		reload();
	}, [reload]);

	const prevDay = () => {
		if (!canGoBack) return;
		const next = new Date(currentDate);
		next.setDate(next.getDate() - 1);
		if (isBeforeToday(next)) return;
		setCurrentDate(next);
	};

	const nextDay = () => {
		const next = new Date(currentDate);
		next.setDate(next.getDate() + 1);
		setCurrentDate(next);
	};

	const openNewAtSlot = (time) => {
		if (isBeforeToday(currentDate)) {
			setFeedbackMessage("Nao e possivel adicionar em datas passadas.");
			return;
		}
		if (isAdmin && !selectedBarberId) {
			setFeedbackMessage("Selecione uma agenda antes de adicionar cliente.");
			return;
		}
		setEditingAppt(undefined);
		setDefaultTimeSlot(time);
		setDialogOpen(true);
		setFeedbackMessage("");
	};

	const openDetails = (appointment) => {
		setSelectedAppointment(null);
		setEditingAppt(appointment);
		setDefaultTimeSlot(appointment.time_slot || "09:00");
		setDialogOpen(true);
	};

	const removeAppointment = async (appointment) => {
		if (!window.confirm("Remover este cliente da agenda?")) return;
		setSelectedAppointment(null);
		setErrorMessage("");
		try {
			await deleteAppointment(appointment.id);
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Nao foi possivel remover cliente.");
		}
	};

	const shopName = profile?.shopName || "Marque's";
	const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

	return (
		<div className="app-shell flex flex-col overflow-hidden bg-background">
			<header className="shrink-0 border-b border-border bg-background/95 px-3 pb-1 pt-1.5 backdrop-blur">
				<div className="flex items-center justify-between gap-2">
					<div className="min-w-0">
						<p className="truncate font-logo text-base leading-tight text-foreground">
							{shopName}
						</p>
					</div>
					<div className="flex min-w-0 shrink-0 items-center gap-2">
						{isAdmin && (
							<select
								value={agendaKey}
								onChange={(event) => {
									setAgendaKey(event.target.value);
									setFeedbackMessage("");
								}}
								className="max-w-[128px] rounded-full border border-border bg-card px-2.5 py-1.5 font-mono-ui text-[10px] text-foreground">
								{!ownBarberId && <option value="">Escolha</option>}
								{ownBarberId && <option value="mine">Minha agenda</option>}
								{teamBarbers.map((barber) => (
									<option key={barber.id} value={barber.id}>
										{barber.name}
									</option>
								))}
							</select>
						)}
						{!isAdmin && (
							<span className="max-w-[128px] truncate rounded-full border border-border bg-card px-2.5 py-1.5 font-mono-ui text-[10px] text-foreground">
								{selectedBarberName}
							</span>
						)}
						<ThemeToggle className="h-7 w-7" />
						<IconButton
							label="Configurações"
							onClick={() => navigate("/settings")}
							className="h-7 w-7">
							⚙
						</IconButton>
					</div>
				</div>

				<div className="mt-1 grid grid-cols-3 gap-1">
					<div className="flex min-w-0 items-baseline justify-center gap-1 rounded-md border border-paid/20 bg-paid/10 px-1.5 py-1">
						<span className="shrink-0 font-mono-ui text-[8px] uppercase text-foreground-faint">
							Recebido
						</span>
						<span className="min-w-0 truncate font-value text-[10px] text-paid">
							{formatCurrency(summary.totalReceived)}
						</span>
					</div>
					<div className="flex min-w-0 items-baseline justify-center gap-1 rounded-md border border-fiado/20 bg-fiado/10 px-1.5 py-1">
						<span className="shrink-0 font-mono-ui text-[8px] uppercase text-foreground-faint">
							A cobrar
						</span>
						<span className="min-w-0 truncate font-value text-[10px] text-fiado">
							{formatCurrency(summary.toCollect)}
						</span>
					</div>
					<div className="flex min-w-0 items-baseline justify-center gap-1 rounded-md border border-border bg-card px-1.5 py-1">
						<span className="shrink-0 font-mono-ui text-[8px] uppercase text-foreground-faint">
							Clientes
						</span>
						<span className="font-value text-[10px] text-foreground">
							{summary.totalClients}
						</span>
					</div>
				</div>

				<div className="mt-1 grid grid-cols-[32px_1fr_32px] items-center gap-2">
					<IconButton
						label="Dia anterior"
						onClick={prevDay}
						disabled={!canGoBack}
						tone="quiet"
						className="h-7 w-7">
						‹
					</IconButton>
					<div className="flex min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-background-deep px-2 py-1">
						<span className="truncate font-mono-ui text-[11px] text-foreground">
							{todaySelected ? "Hoje, " : ""}
							{formatDateDisplay(currentDate)}
						</span>
						{todaySelected && (
							<span className="rounded-full bg-paid px-2 py-0.5 font-mono-ui text-[9px] uppercase text-primary-foreground">
								hoje
							</span>
						)}
					</div>
					<IconButton
						label="Próximo dia"
						onClick={nextDay}
						tone="quiet"
						className="h-7 w-7">
						›
					</IconButton>
				</div>
			</header>

			<main className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
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
									onClick={reload}
									className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground">
									Tentar novamente
								</button>
							}>
							{errorMessage}
						</Notice>
					</div>
				)}

				{isLoading && appointments.length === 0 ?
					<LoadingCard label="Carregando horários" rows={5} />
				:	<div className="space-y-1.5 pb-2">
						{slots.map((slot, index) => {
							const appointment = appointmentsByTime.get(slot.time);
							const slotIsPast =
								todaySelected && slot.minutes + SLOT_STEP_MINUTES <= currentMinutes;

							return (
								<div key={slot.time}>
									{index === nowLineIndex && (
										<div className="grid grid-cols-[54px_1fr] items-center gap-2 py-1">
											<span className="font-mono-ui text-[9px] uppercase text-overdue">
												agora
											</span>
											<div className="h-px bg-overdue" />
										</div>
									)}
									<div
										className={`grid grid-cols-[54px_1fr] gap-2 ${
											slotIsPast ? "opacity-50" : ""
										}`}>
										<div className="pt-3 text-left font-mono-ui text-xs text-foreground-faint">
											{slot.time}
										</div>
										{appointment ?
											<button
												type="button"
												onClick={() => setSelectedAppointment(appointment)}
												className="min-h-[64px] w-full rounded-lg border border-paid/35 bg-[hsl(var(--status-paid-bg))] px-3 py-2 text-left transition-colors hover:bg-paid/20">
												<div className="flex items-start justify-between gap-2">
													<div className="min-w-0">
														<p className="truncate font-client text-sm font-semibold text-foreground">
															{appointment.client_name}
														</p>
														<p className="mt-1 truncate font-mono-ui text-[10px] text-foreground-faint">
															{appointment.service_name || "Atendimento"} ·{" "}
															{formatCurrency(Number(appointment.value || 0))}
														</p>
													</div>
													<span
														className={`shrink-0 rounded-full border px-2 py-0.5 font-mono-ui text-[9px] uppercase ${
															appointment.status === "paid" ?
																"border-paid/40 bg-paid/20 text-paid"
															:	"border-fiado/40 bg-fiado/15 text-fiado"
														}`}>
														{getStatusLabel(appointment.status)}
													</span>
												</div>
											</button>
										:	<button
												type="button"
												onClick={() => openNewAtSlot(slot.time)}
												className="grid min-h-[58px] w-full grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-dashed border-border bg-card/45 px-3 py-2 text-left transition-colors hover:border-paid/40 hover:bg-paid/5">
												<span className="font-mono-ui text-[10px] uppercase text-foreground-faint">
													+ adicionar cliente
												</span>
												<span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background-deep font-mono-ui text-lg text-paid">
													+
												</span>
											</button>
										}
									</div>
								</div>
							);
						})}
					</div>
				}
			</main>

			<BottomNav />

			{selectedAppointment && (
				<div
					className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-0 backdrop-blur-sm"
					onClick={() => setSelectedAppointment(null)}>
					<div
						className="w-full max-w-[480px] rounded-t-lg border-x border-t border-border bg-background p-4"
						onClick={(event) => event.stopPropagation()}>
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							{selectedAppointment.time_slot}
						</p>
						<h2 className="mt-1 truncate font-logo text-lg text-foreground">
							{selectedAppointment.client_name}
						</h2>
						<p className="mt-2 font-client text-sm text-foreground-faint">
							{selectedAppointment.service_name || "Atendimento"} ·{" "}
							{formatCurrency(Number(selectedAppointment.value || 0))}
						</p>
						<div className="mt-4 grid grid-cols-2 gap-2">
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
					</div>
				</div>
			)}

			{dialogOpen && (
				<AppointmentDialog
					dayKey={dayKey}
					appointment={editingAppt}
					barbers={[]}
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
