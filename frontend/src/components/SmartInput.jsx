import { useState } from "react";
import { addAppointment } from "@/lib/store";

// Campo rapido para criar atendimento direto na tela.
export function SmartInput({ dayKey, onAdd }) {
	const [clientName, setClientName] = useState("");
	const [timeValue, setTimeValue] = useState("09:00");
	const [value, setValue] = useState("");
	const handleSubmit = async () => {
		if (!clientName.trim()) return;
		// Cria agendamento rapido direto pelos campos da barra inferior.
		await addAppointment({
			client_name: clientName.trim(),
			time_slot: timeValue,
			value: parseFloat(value) || 0,
			status: "normal",
			day_key: dayKey,
		});
		setClientName("");
		setTimeValue("09:00");
		setValue("");
		await onAdd();
	};
	const handleKeyDown = (e) => {
		// Permite salvar apertando Enter.
		if (e.key === "Enter") {
			e.preventDefault();
			handleSubmit();
		}
	};
	return (
		<div className="flex items-center gap-2 w-full">
			<input
				type="time"
				className="w-24 bg-secondary text-foreground text-sm px-2 py-1.5 rounded border border-border"
				value={timeValue}
				onChange={(e) => setTimeValue(e.target.value)}
				onKeyDown={handleKeyDown}
			/>
			<input
				className="flex-1 bg-secondary text-foreground text-sm px-2 py-1.5 rounded border border-border min-w-0"
				placeholder="Cliente"
				value={clientName}
				onChange={(e) => setClientName(e.target.value)}
				onKeyDown={handleKeyDown}
				autoComplete="off"
			/>
			<input
				type="number"
				step="0.01"
				className="w-20 bg-secondary text-foreground text-sm text-right px-2 py-1.5 rounded border border-border"
				placeholder="0.00"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
			/>
			<button
				onClick={handleSubmit}
				className="px-3 py-1.5 rounded border border-border text-sm bg-card shrink-0">
				OK
			</button>
		</div>
	);
}
