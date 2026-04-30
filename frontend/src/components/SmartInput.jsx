import { useState } from "react";
import { addAppointment } from "@/lib/store";
import {
	parseMoneyInput,
	validateMoney,
	validateRequiredText,
	validateTime,
} from "@/lib/validation";

// Campo rapido para criar atendimento direto na tela.
export function SmartInput({ dayKey, onAdd, onError }) {
	const [clientName, setClientName] = useState("");
	const [timeValue, setTimeValue] = useState("09:00");
	const [value, setValue] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const handleSubmit = async () => {
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
			validateTime(timeValue, "Horario") ||
			moneyValidation;
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
			// Envia `value` apenas se for um número válido.
			const parsedValue = parseMoneyInput(value);
			const payload = {
				client_name: clientName.trim(),
				time_slot: timeValue,
				status: "normal",
				day_key: dayKey,
			};
			if (Number.isFinite(parsedValue)) payload.value = parsedValue;

			await addAppointment(payload);
			setClientName("");
			setTimeValue("09:00");
			setValue("");
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
			<div className="flex items-center gap-2 w-full">
				<input
					type="time"
					className="w-24 bg-secondary text-foreground text-sm px-2 py-1.5 rounded border border-border"
					value={timeValue}
					onChange={(e) => {
						setTimeValue(e.target.value);
						setErrorMessage("");
					}}
					onKeyDown={handleKeyDown}
					disabled={isSubmitting}
				/>
				<input
					className="flex-1 bg-secondary text-foreground text-sm px-2 py-1.5 rounded border border-border min-w-0"
					placeholder="Cliente"
					value={clientName}
					onChange={(e) => {
						setClientName(e.target.value);
						setErrorMessage("");
					}}
					onKeyDown={handleKeyDown}
					autoComplete="off"
					disabled={isSubmitting}
				/>
				<input
					type="text"
					inputMode="decimal"
					className="w-20 bg-secondary text-foreground text-sm text-right px-2 py-1.5 rounded border border-border"
					placeholder="0.00"
					value={value}
					onChange={(e) => {
						setValue(e.target.value);
						setErrorMessage("");
					}}
					onKeyDown={handleKeyDown}
					disabled={isSubmitting}
				/>
				<button
					onClick={handleSubmit}
					disabled={isSubmitting}
					className="px-3 py-1.5 rounded border border-border text-sm bg-card shrink-0">
					{isSubmitting ? "..." : "OK"}
				</button>
			</div>
			{errorMessage && (
				<p className="font-mono-ui text-[10px] text-overdue mt-1">
					{errorMessage}
				</p>
			)}
		</div>
	);
}
