import { useState } from "react";
import { addAppointment } from "@/lib/store";
export function SmartInput({ dayKey, onAdd }) {
	const [clientName, setClientName] = useState("");
	const [timeValue, setTimeValue] = useState("09:00");
	const [value, setValue] = useState("");
	const handleSubmit = () => {
		if (!clientName.trim()) return;
		addAppointment({
			client_name: clientName.trim(),
			time_slot: timeValue,
			value: parseFloat(value) || 0,
			status: "normal",
			day_key: dayKey,
		});
		setClientName("");
		setTimeValue("09:00");
		setValue("");
		onAdd();
	};
	const handleKeyDown = (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleSubmit();
		}
	};
	return (
		<div className="flex items-center gap-2 w-full">
			<input
				type="time"
				className="w-24 bg-transparent text-foreground font-mono text-sm outline-none"
				value={timeValue}
				onChange={(e) => setTimeValue(e.target.value)}
				onKeyDown={handleKeyDown}
			/>
			<input
				className="flex-1 bg-transparent text-foreground font-mono text-sm tracking-wider outline-none placeholder:text-foreground-faint/50 min-w-0"
				placeholder="Cliente"
				value={clientName}
				onChange={(e) => setClientName(e.target.value)}
				onKeyDown={handleKeyDown}
				autoComplete="off"
			/>
			<input
				type="number"
				step="0.01"
				className="w-20 bg-transparent text-foreground font-mono text-sm text-right tracking-wider outline-none placeholder:text-foreground-faint/50"
				placeholder="0.00"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
			/>
			<button
				onClick={handleSubmit}
				className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground-faint hover:text-foreground hover:bg-secondary transition-colors active:scale-95 shrink-0">
				↵
			</button>
		</div>
	);
}
