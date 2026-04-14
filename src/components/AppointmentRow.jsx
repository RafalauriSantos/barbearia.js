import { useState } from "react";
import {
	formatCurrency,
	updateAppointment,
	deleteAppointment,
	loadServices,
} from "@/lib/store";
export function AppointmentRow({ appointment, onUpdate, onEdit }) {
	const [expanded, setExpanded] = useState(false);
	const [showServicePicker, setShowServicePicker] = useState(false);
	const today = new Date().toISOString().slice(0, 10);
	const isOverdue =
		appointment.status === "fiado" &&
		appointment.prazo_date &&
		appointment.prazo_date < today;
	const statusColor =
		appointment.status === "paid" ? "paid"
		: isOverdue ? "overdue"
		: appointment.status === "fiado" ? "fiado"
		: "normal";
	const prazoLabel = (() => {
		if (!appointment.prazo_date) return null;
		const prazo = new Date(appointment.prazo_date + "T12:00:00");
		const diff = Math.ceil(
			(prazo.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
		);
		if (diff < 0) return `${Math.abs(diff)}d atraso`;
		if (diff === 0) return "hoje";
		const d = prazo.getDate();
		const m = prazo.getMonth() + 1;
		return `${d}/${m}`;
	})();
	return (
		<div className="animate-row-in">
			<div className="flex items-center gap-3 px-4 py-3.5 bg-background">
				<span className="font-mono-ui text-xs text-foreground-faint w-12 shrink-0">
					{appointment.time_slot}
				</span>

				<div className="flex-1 min-w-0 flex items-center gap-1.5">
					<span className="font-client text-base text-foreground truncate">
						{appointment.client_name}
					</span>
					{appointment.service_name && (
						<span className="font-mono-ui text-[9px] text-foreground-faint truncate">
							· {appointment.service_name}
						</span>
					)}
					<button
						onClick={() => setShowServicePicker((prev) => !prev)}
						className="px-2 py-1 rounded border border-border text-[10px] text-foreground-faint shrink-0">
						SERVICO
					</button>
				</div>

				{appointment.barber_name && (
					<span className="font-mono-ui text-[9px] text-foreground-faint bg-secondary px-2 py-0.5 rounded shrink-0">
						{appointment.barber_name}
					</span>
				)}

				<span
					className={`font-client text-sm shrink-0 ${appointment.status === "paid" ? "text-paid" : "text-foreground"}`}>
					{appointment.value > 0 ? formatCurrency(appointment.value) : "R$ ·"}
				</span>

				{prazoLabel && (
					<span
						className={`font-mono-ui text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${isOverdue ? "text-overdue border-overdue/30 bg-overdue/10" : "text-fiado border-fiado/30 bg-fiado/10"}`}>
						{prazoLabel}
					</span>
				)}

				<div className={`w-2 h-2 rounded-full shrink-0 dot-${statusColor}`} />
				<button
					onClick={() => setExpanded((prev) => !prev)}
					className="font-mono-ui text-[10px] text-foreground-faint px-2 py-1 rounded border border-border">
					{expanded ? "FECHAR" : "AÇÕES"}
				</button>
			</div>

			{showServicePicker && (
				<ServicePicker
					appointment={appointment}
					onUpdate={onUpdate}
					onClose={() => setShowServicePicker(false)}
				/>
			)}
			{expanded && (
				<InlineEditor
					appointment={appointment}
					onUpdate={onUpdate}
					onClose={() => setExpanded(false)}
					onEdit={onEdit}
				/>
			)}

			<div className="border-b border-border/50 mx-4" />
		</div>
	);
}
function InlineEditor({ appointment, onUpdate, onClose, onEdit }) {
	const [value, setValue] = useState(appointment.value.toString());
	const [status, setStatus] = useState(appointment.status);
	const save = () => {
		updateAppointment(appointment.id, {
			value: parseFloat(value) || 0,
			status,
		});
		onUpdate();
		onClose();
	};
	const handleDelete = () => {
		deleteAppointment(appointment.id);
		onUpdate();
		onClose();
	};
	return (
		<div className="animate-slide-down bg-background-deep px-4 py-3 flex items-center gap-2 flex-wrap">
			<input
				className="bg-secondary text-foreground font-mono-ui text-xs px-2 py-1.5 rounded w-20 border border-border"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				inputMode="decimal"
				placeholder="Valor"
			/>
			<select
				className="bg-secondary text-foreground font-mono-ui text-[10px] px-2 py-1.5 rounded border border-border"
				value={status}
				onChange={(e) => setStatus(e.target.value)}>
				<option value="normal">Normal</option>
				<option value="paid">Pago</option>
				<option value="fiado">Fiado</option>
			</select>
			<button
				onClick={save}
				className="font-mono-ui text-[10px] text-paid bg-paid/10 px-3 py-1.5 rounded border border-border">
				OK
			</button>
			{onEdit && (
				<button
					onClick={onEdit}
					className="font-mono-ui text-[10px] text-foreground-faint px-2 py-1.5 rounded border border-border">
					EDITAR
				</button>
			)}
			<button
				onClick={handleDelete}
				className="font-mono-ui text-[10px] text-overdue bg-overdue/10 px-2 py-1.5 rounded border border-border ml-auto">
				EXCLUIR
			</button>
		</div>
	);
}
function ServicePicker({ appointment, onUpdate, onClose }) {
	const services = loadServices();
	const handleSelect = (svc) => {
		updateAppointment(appointment.id, {
			service_id: svc.id,
			service_name: svc.name,
			value: (appointment.value || 0) + svc.price,
		});
		onUpdate();
		onClose();
	};
	if (services.length === 0) {
		return (
			<div className="animate-slide-down bg-background-deep px-4 py-3">
				<span className="font-mono-ui text-[10px] text-foreground-faint">
					Nenhum serviço cadastrado. Vá em Serviços para adicionar.
				</span>
			</div>
		);
	}
	return (
		<div className="animate-slide-down bg-background-deep px-4 py-2 flex flex-wrap gap-1.5">
			{services.map((svc) => (
				<button
					key={svc.id}
					onClick={() => handleSelect(svc)}
					className="font-mono-ui text-[10px] text-foreground bg-secondary px-2.5 py-1.5 rounded border border-border">
					{svc.name} · R$ {svc.price.toFixed(2)}
				</button>
			))}
		</div>
	);
}
