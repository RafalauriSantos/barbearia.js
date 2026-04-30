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
			className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60"
			onClick={onClose}>
			<div
				className="app-shell bg-background-deep border-t border-border w-full"
				onClick={(e) => e.stopPropagation()}>
				<div className="px-4 pt-4 pb-2 flex items-center justify-between">
					<h2 className="font-logo text-foreground text-base">
						{appointment ? "EDITAR" : "NOVO AGENDAMENTO"}
					</h2>
					<button
						onClick={onClose}
						className="text-foreground-faint text-sm border border-border rounded px-2 py-1">
						FECHAR
					</button>
				</div>

				<form onSubmit={handleSubmit} className="px-4 pb-6 space-y-3">
					{errorMessage && (
						<p className="font-mono-ui text-[10px] text-overdue">
							{errorMessage}
						</p>
					)}

					<div>
						<label className="font-mono-ui text-[10px] text-foreground-faint block mb-1">
							CLIENTE
						</label>
						<input
							type="text"
							value={clientName}
							onChange={(e) => {
								setClientName(e.target.value);
								setErrorMessage("");
							}}
							className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
							placeholder="Nome do cliente"
							autoFocus
							disabled={isSubmitting}
						/>
					</div>

					<div className="flex gap-3">
						<div className="flex-1">
							<label className="font-mono-ui text-[10px] text-foreground-faint block mb-1">
								HORÁRIO
							</label>
							<input
								type="time"
								value={timeSlot}
								onChange={(e) => {
									setTimeSlot(e.target.value);
									setErrorMessage("");
								}}
								className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
								disabled={isSubmitting}
							/>
						</div>
						<div className="flex-1">
							<label className="font-mono-ui text-[10px] text-foreground-faint block mb-1">
								VALOR (R$)
							</label>
							<input
								type="text"
								inputMode="decimal"
								value={value}
								onChange={(e) => {
									setValue(e.target.value);
									setErrorMessage("");
								}}
								className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
								placeholder="40.00"
								disabled={isSubmitting}
							/>
						</div>
					</div>

					{!isLoadingServices && services.length > 0 && (
						<div>
							<label className="font-mono-ui text-[10px] text-foreground-faint block mb-1">
								SERVIÇO (OPCIONAL)
							</label>
							<select
								value={serviceId}
								onChange={(e) => handleServiceChange(e.target.value)}
								className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
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
						className="w-full bg-foreground text-primary-foreground font-mono-ui text-sm py-2 rounded mt-1">
						{isSubmitting ?
							"SALVANDO..."
						: appointment ?
							"SALVAR"
						:	"ADICIONAR"}
					</button>
				</form>
			</div>
		</div>
	);
}
