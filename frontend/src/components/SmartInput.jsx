import { useState } from "react";
import { addAppointment } from "@/lib/store";
import { validateRequiredText, validateTime } from "@/lib/validation";

// Campo rapido para criar atendimento direto na tela.
export function SmartInput({
	dayKey,
	barbeiroId,
	onAdd,
	onError,
	requireBarberSelection = false,
}) {
	const [clientName, setClientName] = useState("");
	const [timeValue, setTimeValue] = useState("09:00");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const handleSubmit = async () => {
		if (isSubmitting) return;
		if (requireBarberSelection && !barbeiroId) {
			const message = "Selecione uma agenda para adicionar atendimento.";
			setErrorMessage(message);
			if (onError) onError(message);
			return;
		}

		const validationMessage =
			validateRequiredText(clientName, "Cliente", {
				minLength: 2,
				maxLength: 80,
			}) || validateTime(timeValue, "Horario");
		if (validationMessage) {
			setErrorMessage(validationMessage);
			if (onError) onError(validationMessage);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		if (onError) onError("");

		try {
			// Cria agendamento rapido direto pelos campos da barra inferior.
			const payload = {
				client_name: clientName.trim(),
				time_slot: timeValue,
				status: "normal",
				day_key: dayKey,
			};
			if (barbeiroId) payload.barbeiro_id = barbeiroId;

			await addAppointment(payload);
			setClientName("");
			setTimeValue("09:00");
			await onAdd();
		} catch (error) {
			const message =
				error.message || "Nao foi possivel salvar o agendamento rapido.";
			setErrorMessage(message);
			if (onError) onError(message);
		} finally {
			setIsSubmitting(false);
		}
	};
	const handleKeyDown = (e) => {
		// Permite salvar apertando Enter.
		if (e.key === "Enter") {
			e.preventDefault();
			handleSubmit();
		}
	};
	return (
		<div className="w-full">
			<div className="grid w-full grid-cols-[84px_1fr_auto] items-center gap-2 rounded-xl border border-border bg-background-deep p-2">
				<input
					type="time"
					className="h-11 rounded-md border border-border bg-secondary px-2 text-sm text-foreground"
					value={timeValue}
					onChange={(e) => {
						setTimeValue(e.target.value);
						setErrorMessage("");
					}}
					onKeyDown={handleKeyDown}
					disabled={isSubmitting}
				/>
				<input
					className="h-11 min-w-0 rounded-md border border-border bg-secondary px-3 text-sm text-foreground"
					placeholder="Nome do cliente"
					value={clientName}
					onChange={(e) => {
						setClientName(e.target.value);
						setErrorMessage("");
					}}
					onKeyDown={handleKeyDown}
					autoComplete="off"
					disabled={isSubmitting}
				/>
				<button
					onClick={handleSubmit}
					disabled={isSubmitting}
					className="flex h-11 w-11 items-center justify-center rounded-md bg-foreground text-lg font-bold text-primary-foreground transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-60">
					{isSubmitting ? "..." : "+"}
				</button>
			</div>
			{errorMessage && (
				<p className="mt-2 font-mono-ui text-[10px] text-overdue">
					{errorMessage}
				</p>
			)}
		</div>
	);
}
