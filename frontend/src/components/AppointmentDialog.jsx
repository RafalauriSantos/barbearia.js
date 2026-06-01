import { useEffect, useRef, useState } from "react";
import {
	getCachedProducts,
	getCachedServices,
	loadServices,
	loadProducts,
	addAppointment,
	updateAppointment,
} from "@/lib/store";
import { IconButton } from "@/components/ScreenPrimitives";
import {
	parseMoneyInput,
	validateMoney,
	validateRequiredText,
	validateTime,
} from "@/lib/validation";

// Janela para criar ou editar um agendamento.
export function AppointmentDialog({
	dayKey,
	appointment,
	barbers = [],
	canChooseBarber = false,
	defaultBarberId = "",
	forcedBarberId = "",
	defaultTimeSlot = "09:00",
	onClose,
	onSave,
	onError,
}) {
	const initialCatalogRef = useRef(null);
	if (!initialCatalogRef.current) {
		initialCatalogRef.current = {
			services: getCachedServices(),
			products: getCachedProducts(),
		};
	}
	const initialCatalog = initialCatalogRef.current;
	const [services, setServices] = useState(initialCatalog.services || []);
	const [isLoadingServices, setIsLoadingServices] = useState(
		!initialCatalog.services,
	);
	const [products, setProducts] = useState(initialCatalog.products || []);
	const [isLoadingProducts, setIsLoadingProducts] = useState(
		!initialCatalog.products,
	);
	// Campos do formulario (novo ou edicao).
	const [clientName, setClientName] = useState(appointment?.client_name || "");
	const [timeSlot, setTimeSlot] = useState(
		String(appointment?.time_slot || defaultTimeSlot || "09:00").slice(0, 5),
	);
	const [selectedServices, setSelectedServices] = useState(
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
	const [selectedProducts, setSelectedProducts] = useState(
		appointment?.products?.length ? appointment.products : [],
	);
	const [value, setValue] = useState(appointment?.value?.toString() || "");
	const [barberId, setBarberId] = useState(
		appointment?.barbeiro_id || defaultBarberId || forcedBarberId || "",
	);
	const [status, setStatus] = useState(appointment?.status || "normal");
	const [prazoDate, setPrazoDate] = useState(appointment?.prazo_date || "");
	const [autoValue, setAutoValue] = useState(() => {
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
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

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
	const addService = (svc) => {
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
	const addProduct = (prod) => {
		setSelectedProducts((prev) => {
			const existing = prev.find((item) => item.id === prod.id);
			if (!existing) {
				return [
					...prev,
					{ id: prod.id, name: prod.name, price: prod.price, quantity: 1 },
				];
			}
			return prev.map((item) =>
				item.id === prod.id ?
					{ ...item, quantity: Number(item.quantity || 1) + 1 }
				:	item,
			);
		});
	};
	const updateItemQuantity = (listSetter, id, quantity) => {
		listSetter((prev) =>
			prev.map((item) => (item.id === id ? { ...item, quantity } : item)),
		);
	};
	const removeItem = (listSetter, id) => {
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
	const handleSubmit = async (e) => {
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
		const data = {
			client_name: clientName.trim(),
			time_slot: timeSlot,
			services: selectedServices,
			products: selectedProducts,
			day_key: dayKey,
			status,
			prazo_date: status === "fiado" ? prazoDate || null : null,
		};
		if (Number.isFinite(parsedValue)) data.value = parsedValue;
		if (forcedBarberId) {
			data.barbeiro_id = forcedBarberId;
		} else if (canChooseBarber && barberId) {
			data.barbeiro_id = barberId;
		}

		try {
			if (appointment) {
				// Se ja existe, atualiza.
				await updateAppointment(appointment.id, data);
			} else {
				// Se nao existe, cria novo.
				await addAppointment(data);
			}
			await onSave();
			onClose();
		} catch (error) {
			const message = error.message || "Nao foi possivel salvar o agendamento.";
			setErrorMessage(message);
			if (onError) onError(message);
		} finally {
			setIsSubmitting(false);
		}
	};
	return (
		<div
			className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-0 backdrop-blur-sm"
			onClick={onClose}>
			<div
				className="max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-lg border-x border-t border-border bg-background"
				onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between px-4 pb-3 pt-4">
					<div>
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							Agenda
						</p>
						<h2 className="mt-1 font-logo text-lg text-foreground">
							{appointment ? "Editar atendimento" : "Novo atendimento"}
						</h2>
					</div>
					<IconButton label="Fechar" onClick={onClose}>
						×
					</IconButton>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3 px-4 pb-6">
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
									setStatus(e.target.value);
									if (e.target.value !== "fiado") {
										setPrazoDate("");
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
			</div>
		</div>
	);
}
