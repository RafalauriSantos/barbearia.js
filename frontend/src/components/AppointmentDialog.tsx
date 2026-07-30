import React, { useEffect, useRef, useState } from "react";
import { BaseModal } from "@/components/BaseModal";
import {
	getCachedProducts,
	getCachedServices,
	getCachedPaymentMethods,
	formatDayKey,
	loadServices,
	loadProducts,
	loadPaymentMethods,
	addAppointment,
	updateAppointment,
} from "@/lib/store";
import {
	parseMoneyInput,
	validateMoney,
	validateRequiredText,
	validateTime,
} from "@/lib/validation";

export interface SelectedItem {
	id: string;
	name: string;
	price: number;
	quantity: number;
	purchase_type?: string;
	cost_price?: number;
	supplier_name?: string;
	seller_commission_percent?: number;
}

export interface CatalogItem {
	id: string;
	name: string;
	price: number;
	purchase_type?: string;
	cost_price?: number;
	supplier_name?: string;
	seller_commission_percent?: number;
	active?: boolean;
	code?: string;
}

export interface BarberItem {
	id: string;
	name: string;
}

export interface AppointmentData {
	id?: string;
	client_name?: string;
	cliente_id?: string | null;
	day_key?: string;
	time_slot?: string;
	value?: number | string;
	status?: "normal" | "paid" | "fiado" | string;
	services?: SelectedItem[];
	products?: SelectedItem[];
	service_id?: string;
	service_name?: string;
	barbeiro_id?: string;
	payment_method_id?: string | null;
	forma_pagamento_id?: string | null;
	payment_date?: string | null;
	prazo_date?: string | null;
}

export interface AppointmentDialogProps {
	dayKey?: string;
	appointment?: AppointmentData | null;
	barbers?: BarberItem[];
	canChooseBarber?: boolean;
	defaultBarberId?: string;
	forcedBarberId?: string;
	defaultTimeSlot?: string;
	defaultClientId?: string;
	defaultClientName?: string;
	canChooseDate?: boolean;
	onClose: () => void;
	onSave: () => Promise<void> | void;
	onError?: (msg: string) => void;
}

// Janela para criar ou editar um agendamento.
export function AppointmentDialog({
	dayKey = "",
	appointment,
	barbers = [],
	canChooseBarber = false,
	defaultBarberId = "",
	forcedBarberId = "",
	defaultTimeSlot = "09:00",
	defaultClientId = "",
	defaultClientName = "",
	canChooseDate = false,
	onClose,
	onSave,
	onError,
}: AppointmentDialogProps) {
	const initialCatalogRef = useRef<{
		services: CatalogItem[] | null;
		products: CatalogItem[] | null;
		paymentMethods: CatalogItem[] | null;
	} | null>(null);

	if (!initialCatalogRef.current) {
		initialCatalogRef.current = {
			services: getCachedServices(),
			products: getCachedProducts(),
			paymentMethods: getCachedPaymentMethods(),
		};
	}
	const initialCatalog = initialCatalogRef.current;
	const [services, setServices] = useState<CatalogItem[]>(initialCatalog.services || []);
	const [isLoadingServices, setIsLoadingServices] = useState<boolean>(
		!initialCatalog.services,
	);
	const [products, setProducts] = useState<CatalogItem[]>(initialCatalog.products || []);
	const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(
		!initialCatalog.products,
	);
	const [paymentMethods, setPaymentMethods] = useState<CatalogItem[]>(
		initialCatalog.paymentMethods || [],
	);
	const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState<boolean>(
		!initialCatalog.paymentMethods,
	);

	// Campos do formulario (novo ou edicao).
	const [clientName, setClientName] = useState<string>(
		appointment?.client_name || defaultClientName,
	);
	const [timeSlot, setTimeSlot] = useState<string>(
		String(appointment?.time_slot || defaultTimeSlot || "09:00").slice(0, 5),
	);
	const [appointmentDate, setAppointmentDate] = useState<string>(
		appointment?.day_key || dayKey,
	);
	const [selectedServices, setSelectedServices] = useState<SelectedItem[]>(
		appointment?.services?.length ? appointment.services
		: appointment?.service_id ?
			[
				{
					id: appointment.service_id,
					name: appointment.service_name || "Servico",
					price: Number(appointment.value || 0),
					quantity: 1,
				},
			]
		:	[],
	);
	const [selectedProducts, setSelectedProducts] = useState<SelectedItem[]>(
		appointment?.products?.length ? appointment.products : [],
	);
	const [value, setValue] = useState<string>(appointment?.value?.toString() || "");
	const [barberId, setBarberId] = useState<string>(
		appointment?.barbeiro_id || defaultBarberId || forcedBarberId || "",
	);
	const [status, setStatus] = useState<string>(appointment?.status || "normal");
	const [paymentMethodId, setPaymentMethodId] = useState<string>(
		appointment?.payment_method_id || appointment?.forma_pagamento_id || "",
	);
	const [paymentDate, setPaymentDate] = useState<string>(
		appointment?.payment_date ||
			(appointment?.status === "paid" ? appointment?.day_key || "" : formatDayKey(new Date())),
	);
	const [prazoDate, setPrazoDate] = useState<string>(appointment?.prazo_date || "");
	const [autoValue, setAutoValue] = useState<boolean>(() => {
		const initialValue = Number(appointment?.value || 0);
		const initialItemsTotal = [
			...selectedServices,
			...selectedProducts,
		].reduce(
			(sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
			0,
		);

		if (initialValue === 0 && initialItemsTotal > 0) return true;
		return Math.abs(initialValue - initialItemsTotal) < 0.01;
	});
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string>("");

	useEffect(() => {
		let mounted = true;

		async function fetchCatalog() {
			try {
				const [serviceList, productList] = await Promise.all([
					loadServices({ force: Boolean(initialCatalog.services) }),
					loadProducts({ force: Boolean(initialCatalog.products) }),
				]);
				if (mounted) {
					setServices(serviceList);
					setProducts(productList);
				}
			} catch {
				if (
					mounted &&
					!(initialCatalog.services && initialCatalog.products)
				) {
					setServices([]);
					setProducts([]);
				}
			} finally {
				if (mounted) {
					setIsLoadingServices(false);
					setIsLoadingProducts(false);
				}
			}
		}

		fetchCatalog();

		return () => {
			mounted = false;
		};
	}, [initialCatalog.products, initialCatalog.services]);

	useEffect(() => {
		let mounted = true;

		loadPaymentMethods({ force: Boolean(initialCatalog.paymentMethods) })
			.then((list: CatalogItem[]) => {
				if (mounted) setPaymentMethods(list);
			})
			.catch(() => {
				if (mounted && !initialCatalog.paymentMethods) setPaymentMethods([]);
			})
			.finally(() => {
				if (mounted) setIsLoadingPaymentMethods(false);
			});

		return () => {
			mounted = false;
		};
	}, [initialCatalog.paymentMethods]);

	const addService = (svc: CatalogItem) => {
		setAutoValue(true);
		setSelectedServices((prev) => {
			const existing = prev.find((item) => item.id === svc.id);
			if (!existing) {
				return [
					...prev,
					{ id: svc.id, name: svc.name, price: svc.price, quantity: 1 },
				];
			}
			return prev.map((item) =>
				item.id === svc.id ?
					{ ...item, quantity: Number(item.quantity || 1) + 1 }
				:	item,
			);
		});
	};

	const addProduct = (prod: CatalogItem) => {
		setAutoValue(true);
		setSelectedProducts((prev) => {
			const existing = prev.find((item) => item.id === prod.id);
			if (!existing) {
				return [
					...prev,
					{
						id: prod.id,
						name: prod.name,
						price: prod.price,
						quantity: 1,
						purchase_type: prod.purchase_type || "avista",
						cost_price: Number(prod.cost_price || 0),
						supplier_name: prod.supplier_name || "",
						seller_commission_percent: Number(
							prod.seller_commission_percent || 0,
						),
					},
				];
			}
			return prev.map((item) =>
				item.id === prod.id ?
					{ ...item, quantity: Number(item.quantity || 1) + 1 }
				:	item,
			);
		});
	};

	const updateItemQuantity = (
		listSetter: React.Dispatch<React.SetStateAction<SelectedItem[]>>,
		id: string,
		quantity: number,
	) => {
		setAutoValue(true);
		listSetter((prev) =>
			prev.map((item) => (item.id === id ? { ...item, quantity } : item)),
		);
	};

	const removeItem = (
		listSetter: React.Dispatch<React.SetStateAction<SelectedItem[]>>,
		id: string,
	) => {
		setAutoValue(true);
		listSetter((prev) => prev.filter((item) => item.id !== id));
	};

	const itemsTotal = [...selectedServices, ...selectedProducts].reduce(
		(sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
		0,
	);

	useEffect(() => {
		if (!autoValue) return;
		if (itemsTotal <= 0) {
			setValue("");
			return;
		}
		setValue(itemsTotal.toFixed(2));
	}, [itemsTotal, autoValue]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		// Valor é opcional: valida somente se preenchido.
		const moneyValidation =
			String(value ?? "").trim() ?
				validateMoney(value, "Valor", { max: 9999.99 })
			:	"";

		const validationMessage =
			validateRequiredText(clientName, "Cliente", {
				minLength: 2,
				maxLength: 80,
			}) ||
			validateTime(timeSlot, "Horario") ||
			moneyValidation;
		if (validationMessage) {
			setErrorMessage(validationMessage);
			if (onError) onError(validationMessage);
			return;
		}

		if (status === "fiado" && !String(prazoDate || "").trim()) {
			const message = "Informe a data do fiado.";
			setErrorMessage(message);
			if (onError) onError(message);
			return;
		}

		if (status === "paid" && !paymentMethodId) {
			const message = "Informe a forma de pagamento.";
			setErrorMessage(message);
			if (onError) onError(message);
			return;
		}

		if (canChooseBarber && !barberId) {
			const message = "Selecione o barbeiro do atendimento.";
			setErrorMessage(message);
			if (onError) onError(message);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		if (onError) onError("");

		// Monta os dados que serao salvos.
		const parsedValue = parseMoneyInput(value);
		const data: Record<string, any> = {
			client_name: clientName.trim(),
			cliente_id: appointment?.cliente_id || defaultClientId || null,
			time_slot: timeSlot,
			services: selectedServices,
			products: selectedProducts,
			day_key: appointmentDate,
			status,
			prazo_date: status === "fiado" ? prazoDate || null : null,
		};
		if (status === "paid") {
			data.payment_method_id = paymentMethodId;
			data.payment_date = paymentDate || appointmentDate;
		}
		if (Number.isFinite(parsedValue)) data.value = parsedValue;
		if (forcedBarberId) {
			data.barbeiro_id = forcedBarberId;
		} else if (canChooseBarber && barberId) {
			data.barbeiro_id = barberId;
		}

		try {
			if (appointment?.id) {
				// Se ja existe, atualiza.
				await updateAppointment(appointment.id, data);
			} else {
				// Se nao existe, cria novo.
				await addAppointment(data);
			}
			await onSave();
			onClose();
		} catch (error: any) {
			const message = error.message || "Nao foi possivel salvar o agendamento.";
			setErrorMessage(message);
			if (onError) onError(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<BaseModal
			eyebrow="Agenda"
			title={appointment ? "Editar atendimento" : "Novo atendimento"}
			onClose={onClose}
			maxWidthClass="max-w-[480px]"
			variant="bottom-sheet">
			<form onSubmit={handleSubmit} className="space-y-3 pb-6">
				{errorMessage && (
					<p className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2 font-mono-ui text-[10px] text-overdue">
						{errorMessage}
					</p>
				)}

				<div className="rounded-lg border border-border bg-card p-4">
					<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
						Cliente
					</label>
					<input
						type="text"
						value={clientName}
						onChange={(e) => {
							setClientName(e.target.value);
							setErrorMessage("");
						}}
						className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
						placeholder="Nome do cliente"
						autoFocus
						disabled={isSubmitting}
					/>
				</div>

				<div className="rounded-lg border border-border bg-card p-4">
					<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
						Serviços
					</label>
					<div className="flex flex-wrap gap-2">
						{isLoadingServices ?
							<span className="font-mono-ui text-[10px] text-foreground-faint">
								Carregando...
							</span>
						: services.length === 0 ?
							<span className="font-mono-ui text-[10px] text-foreground-faint">
								Nenhum serviço cadastrado
							</span>
						:	services.map((svc) => (
								<button
									key={svc.id}
									type="button"
									onClick={() => addService(svc)}
									className="rounded-md border border-border bg-secondary px-3 py-2 font-mono-ui text-[10px] text-foreground">
									{svc.name} · R$ {svc.price.toFixed(2)}
								</button>
							))
						}
					</div>
					{selectedServices.length > 0 && (
						<div className="mt-3 space-y-2">
							{selectedServices.map((item) => (
								<div
									key={item.id}
									className="flex items-center gap-2 rounded-md border border-border bg-background-deep px-3 py-2">
									<span className="min-w-0 flex-1 truncate font-mono-ui text-[10px] text-foreground">
										{item.name}
									</span>
									<input
										type="number"
										min="1"
										value={item.quantity}
										onChange={(e) =>
											updateItemQuantity(
												setSelectedServices,
												item.id,
												Math.max(1, Number(e.target.value || 1)),
											)
										}
										className="w-16 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
										disabled={isSubmitting}
									/>
									<button
										type="button"
										onClick={() => removeItem(setSelectedServices, item.id)}
										className="rounded-md border border-overdue/40 bg-overdue/10 px-2 py-1 font-mono-ui text-[9px] text-overdue">
										remover
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="rounded-lg border border-border bg-card p-4">
					<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
						Produtos
					</label>
					<div className="flex flex-wrap gap-2">
						{isLoadingProducts ?
							<span className="font-mono-ui text-[10px] text-foreground-faint">
								Carregando...
							</span>
						: products.length === 0 ?
							<span className="font-mono-ui text-[10px] text-foreground-faint">
								Nenhum produto cadastrado
							</span>
						:	products.map((prod) => (
								<button
									key={prod.id}
									type="button"
									onClick={() => addProduct(prod)}
									className="rounded-md border border-border bg-secondary px-3 py-2 font-mono-ui text-[10px] text-foreground">
									{prod.name} · R$ {prod.price.toFixed(2)}
								</button>
							))
						}
					</div>
					{selectedProducts.length > 0 && (
						<div className="mt-3 space-y-2">
							{selectedProducts.map((item) => (
								<div
									key={item.id}
									className="flex items-center gap-2 rounded-md border border-border bg-background-deep px-3 py-2">
									<span className="min-w-0 flex-1 truncate font-mono-ui text-[10px] text-foreground">
										{item.name}
									</span>
									<input
										type="number"
										min="1"
										value={item.quantity}
										onChange={(e) =>
											updateItemQuantity(
												setSelectedProducts,
												item.id,
												Math.max(1, Number(e.target.value || 1)),
											)
										}
										className="w-16 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground"
										disabled={isSubmitting}
									/>
									<button
										type="button"
										onClick={() => removeItem(setSelectedProducts, item.id)}
										className="rounded-md border border-overdue/40 bg-overdue/10 px-2 py-1 font-mono-ui text-[9px] text-overdue">
										remover
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{canChooseDate && (
					<div className="rounded-lg border border-border bg-card p-4">
						<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
							Data
						</label>
						<input
							type="date"
							value={appointmentDate}
							onChange={(event) => setAppointmentDate(event.target.value)}
							className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
							disabled={isSubmitting}
						/>
					</div>
				)}

				<div className="grid grid-cols-2 gap-3">
					<div className="rounded-lg border border-border bg-card p-4">
						<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
							Horário
						</label>
						<input
							type="time"
							value={timeSlot}
							onChange={(e) => {
								setTimeSlot(e.target.value);
								setErrorMessage("");
							}}
							className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
							disabled={isSubmitting}
						/>
					</div>
					<div className="rounded-lg border border-border bg-card p-4">
						<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
							Valor
						</label>
						<input
							type="text"
							inputMode="decimal"
							value={value}
							onChange={(e) => {
								setValue(e.target.value);
								setAutoValue(false);
								setErrorMessage("");
							}}
							className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
							placeholder="40.00"
							disabled={isSubmitting}
						/>
						<p className="mt-2 font-mono-ui text-[9px] text-foreground-faint">
							Total dos itens: R$ {itemsTotal.toFixed(2)}
						</p>
						<button
							type="button"
							onClick={() => {
								setAutoValue(true);
								setValue(itemsTotal.toFixed(2));
							}}
							className="mt-2 rounded-md border border-border px-2 py-1 font-mono-ui text-[9px] text-foreground-faint">
							Usar total dos itens
						</button>
					</div>
				</div>

				<div className="rounded-lg border border-border bg-card p-4">
					<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
						Pagamento
					</label>
					<div className="grid grid-cols-2 gap-3">
						<select
							value={status}
							onChange={(e) => {
								const nextStatus = e.target.value;
								setStatus(nextStatus);
								if (e.target.value !== "fiado") {
									setPrazoDate("");
								}
								if (e.target.value !== "paid") {
									setPaymentMethodId("");
								} else {
									setPaymentDate(
										appointment ? formatDayKey(new Date()) : appointmentDate,
									);
								}
								setErrorMessage("");
							}}
							className="rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
							disabled={isSubmitting}>
							<option value="normal">Pendente</option>
							<option value="paid">Pago</option>
							<option value="fiado">Fiado</option>
						</select>
						<input
							type="date"
							value={prazoDate}
							onChange={(e) => {
								setPrazoDate(e.target.value);
								setErrorMessage("");
							}}
							className="rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
							disabled={isSubmitting || status !== "fiado"}
							placeholder="Prazo"
						/>
					</div>
					{status === "fiado" && (
						<p className="mt-2 font-mono-ui text-[9px] text-foreground-faint">
							Informe a data para cobrar o fiado.
						</p>
					)}
					{status === "paid" && (
						<div className="mt-3 grid grid-cols-2 gap-3">
							<div>
								<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
									Forma de pagamento
								</label>
								<select
									value={paymentMethodId}
									onChange={(e) => {
										setPaymentMethodId(e.target.value);
										setErrorMessage("");
									}}
									className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
									disabled={isSubmitting || isLoadingPaymentMethods}>
									<option value="">
										{isLoadingPaymentMethods ?
											"Carregando formas..."
										:	"Selecione a forma"}
									</option>
									{paymentMethods
										.filter((method) => method.active !== false && method.code !== "fiado")
										.map((method) => (
											<option key={method.id} value={method.id}>
												{method.name}
											</option>
										))}
								</select>
							</div>
							<div>
								<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
									Data do pagamento
								</label>
								<input
									type="date"
									value={paymentDate}
									onChange={(event) => setPaymentDate(event.target.value)}
									className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
									disabled={isSubmitting}
								/>
							</div>
						</div>
					)}
				</div>

				{canChooseBarber && (
					<div className="rounded-lg border border-border bg-card p-4">
						<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
							Barbeiro
						</label>
						<select
							value={barberId}
							onChange={(e) => {
								setBarberId(e.target.value);
								setErrorMessage("");
							}}
							className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
							disabled={isSubmitting}>
							<option value="">Selecione</option>
							{barbers.map((barber) => (
								<option key={barber.id} value={barber.id}>
									{barber.name}
								</option>
							))}
						</select>
					</div>
				)}

				<button
					type="submit"
					disabled={isSubmitting}
					className="w-full rounded-md bg-foreground px-6 py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
					{isSubmitting ?
						"Salvando..."
					: appointment ?
						"Salvar alterações"
					:	"Confirmar"}
				</button>
			</form>
		</BaseModal>
	);
}
