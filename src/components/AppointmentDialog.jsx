import { useState } from "react";
import { loadServices, addAppointment, updateAppointment } from "@/lib/store";
export function AppointmentDialog({ dayKey, appointment, onClose, onSave }) {
	const services = loadServices();
	const [clientName, setClientName] = useState(appointment?.client_name || "");
	const [timeSlot, setTimeSlot] = useState(appointment?.time_slot || "09:00");
	const [serviceId, setServiceId] = useState(appointment?.service_id || "");
	const [value, setValue] = useState(appointment?.value?.toString() || "");
	const handleServiceChange = (id) => {
		setServiceId(id);
		if (id) {
			const svc = services.find((s) => s.id === id);
			if (svc) setValue(svc.price.toString());
		}
	};
	const handleSubmit = (e) => {
		e.preventDefault();
		if (!clientName.trim()) return;
		const svc = services.find((s) => s.id === serviceId);
		const data = {
			client_name: clientName.trim(),
			time_slot: timeSlot,
			value: parseFloat(value) || 0,
			service_id: serviceId || undefined,
			service_name: svc?.name,
			day_key: dayKey,
			status: appointment?.status || "normal",
		};
		if (appointment) {
			updateAppointment(appointment.id, data);
		} else {
			addAppointment(data);
		}
		onSave();
		onClose();
	};
	return (
		<div
			className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60"
			onClick={onClose}>
			<div
				className="app-shell bg-background-deep rounded-t-xl border-t border-border animate-fade-up w-full"
				onClick={(e) => e.stopPropagation()}>
				<div className="px-4 pt-4 pb-2 flex items-center justify-between">
					<h2 className="font-logo text-foreground text-base tracking-wider">
						{appointment ? "EDITAR" : "NOVO AGENDAMENTO"}
					</h2>
					<button
						onClick={onClose}
						className="text-foreground-faint hover:text-foreground text-lg active:scale-95">
						✕
					</button>
				</div>

				<form onSubmit={handleSubmit} className="px-4 pb-6 space-y-3">
					<div>
						<label className="font-mono-ui text-[10px] text-foreground-faint block mb-1">
							CLIENTE
						</label>
						<input
							type="text"
							value={clientName}
							onChange={(e) => setClientName(e.target.value)}
							className="w-full bg-secondary text-foreground font-mono text-sm px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring placeholder:text-foreground-faint/40"
							placeholder="Nome do cliente"
							autoFocus
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
								onChange={(e) => setTimeSlot(e.target.value)}
								className="w-full bg-secondary text-foreground font-mono text-sm px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring"
							/>
						</div>
						<div className="flex-1">
							<label className="font-mono-ui text-[10px] text-foreground-faint block mb-1">
								VALOR (R$)
							</label>
							<input
								type="number"
								step="0.01"
								value={value}
								onChange={(e) => setValue(e.target.value)}
								className="w-full bg-secondary text-foreground font-mono text-sm px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring placeholder:text-foreground-faint/40"
								placeholder="40.00"
							/>
						</div>
					</div>

					{services.length > 0 && (
						<div>
							<label className="font-mono-ui text-[10px] text-foreground-faint block mb-1">
								SERVIÇO (OPCIONAL)
							</label>
							<select
								value={serviceId}
								onChange={(e) => handleServiceChange(e.target.value)}
								className="w-full bg-secondary text-foreground font-mono-ui text-xs px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring">
								<option value="">Nenhum</option>
								{services.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name} — R$ {s.price.toFixed(2)}
									</option>
								))}
							</select>
						</div>
					)}

					<button
						type="submit"
						className="w-full bg-foreground text-primary-foreground font-mono-ui text-xs py-3 rounded hover:opacity-90 transition-opacity active:scale-[0.98] mt-1">
						{appointment ? "SALVAR" : "ADICIONAR"}
					</button>
				</form>
			</div>
		</div>
	);
}
