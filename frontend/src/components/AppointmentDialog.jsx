import { useEffect, useState } from "react";
import { loadServices, addAppointment, updateAppointment } from "@/lib/store";
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
	onClose,
	onSave,
	onError,
}) {
	const [services, setServices] = useState([]);
	const [isLoadingServices, setIsLoadingServices] = useState(true);
	// Campos do formulario (novo ou edicao).
	const [clientName, setClientName] = useState(appointment?.client_name || "");
	const [timeSlot, setTimeSlot] = useState(appointment?.time_slot || "09:00");
	const [serviceId, setServiceId] = useState(appointment?.service_id || "");
	const [value, setValue] = useState(appointment?.value?.toString() || "");
	const [barberId, setBarberId] = useState(
		appointment?.barbeiro_id || defaultBarberId || forcedBarberId || "",
	);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		let mounted = true;

		async function fetchServices() {
			try {
				const list = await loadServices();
				if (mounted) {
					setServices(list);
				}
			} catch {
				if (mounted) {
					setServices([]);
				}
			} finally {
				if (mounted) {
					setIsLoadingServices(false);
				}
			}
		}

		fetchServices();

		return () => {
			mounted = false;
		};
	}, []);
	// Quando escolhe servico, preenche o valor automaticamente.
	const handleServiceChange = (id) => {
		setServiceId(id);
		if (id) {
			const svc = services.find((s) => s.id === id);
			if (svc) setValue(svc.price.toString());
		}
	};
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

		if (canChooseBarber && !barberId) {
			const message = "Selecione o barbeiro do atendimento.";
			setErrorMessage(message);
			if (onError) onError(message);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		if (onError) onError("");

		const svc = services.find((s) => s.id === serviceId);
		// Monta os dados que serao salvos.
		const parsedValue = parseMoneyInput(value);
		const data = {
			client_name: clientName.trim(),
			time_slot: timeSlot,
			service_id: serviceId || undefined,
			service_name: svc?.name,
			day_key: dayKey,
			status: appointment?.status || "normal",
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
					<button
						onClick={onClose}
						className="rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
						Fechar
					</button>
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
									setErrorMessage("");
								}}
								className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
								placeholder="40.00"
								disabled={isSubmitting}
							/>
						</div>
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

					{!isLoadingServices && services.length > 0 && (
						<div className="rounded-lg border border-border bg-card p-4">
							<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
								Serviço opcional
							</label>
							<select
								value={serviceId}
								onChange={(e) => handleServiceChange(e.target.value)}
								className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
								disabled={isSubmitting}>
								<option value="">Nenhum</option>
								{services.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name} - R$ {s.price.toFixed(2)}
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
						:	"Adicionar atendimento"}
					</button>
				</form>
			</div>
		</div>
	);
}
