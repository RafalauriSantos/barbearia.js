import { memo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/store";

const SWIPE_STATUS_THRESHOLD = 72;
const SWIPE_STATUS_MAX_OFFSET = 116;

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function getStatusLabel(status) {
	if (status === "paid") return "pago";
	if (status === "fiado") return "fiado";
	return "pendente";
}

function formatFiadoLabel(prazoDate) {
	if (!prazoDate) return "";
	const prazo = new Date(prazoDate + "T12:00:00");
	const day = prazo.getDate();
	const month = prazo.getMonth() + 1;
	return `${day}/${month}`;
}

function getAppointmentSummary(appointment) {
	const services =
		Array.isArray(appointment.services) ? appointment.services : [];
	const products =
		Array.isArray(appointment.products) ? appointment.products : [];
	const serviceNames = services.map((item) => item.name).filter(Boolean);
	const productNames = products
		.map((item) =>
			item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name,
		)
		.filter(Boolean);
	const names = [...serviceNames, ...productNames].filter(Boolean);
	if (names.length > 0) return names.join(", ");
	return appointment.service_name || "Atendimento";
}

const AppointmentSwipeRow = memo(function AppointmentSwipeRow({
	appointment,
	isSaving,
	onOpen,
	onStatusChange,
}) {
	const pointerRef = useRef(null);
	const [dragX, setDragX] = useState(0);
	const [dragAction, setDragAction] = useState(null);

	const resetDrag = () => {
		pointerRef.current = null;
		setDragX(0);
		setDragAction(null);
	};

	const updateDrag = (nextX) => {
		const clampedX = clamp(
			nextX,
			-SWIPE_STATUS_MAX_OFFSET,
			SWIPE_STATUS_MAX_OFFSET,
		);
		const nextAction =
			clampedX >= SWIPE_STATUS_THRESHOLD ? "paid"
			: clampedX <= -SWIPE_STATUS_THRESHOLD ? "fiado"
			: null;
		if (pointerRef.current) {
			pointerRef.current.action = nextAction;
		}
		setDragX(clampedX);
		setDragAction(nextAction);
	};

	const handlePointerDown = (event) => {
		if (isSaving) return;
		pointerRef.current = {
			id: event.pointerId,
			source: "pointer",
			startX: event.clientX,
			startY: event.clientY,
			dragging: false,
			moved: false,
			action: null,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const moveDrag = (event, source) => {
		const pointer = pointerRef.current;
		if (!pointer || pointer.source !== source) return false;
		if (source === "pointer" && pointer.id !== event.pointerId) return false;

		const deltaX = event.clientX - pointer.startX;
		const deltaY = event.clientY - pointer.startY;
		const absX = Math.abs(deltaX);
		const absY = Math.abs(deltaY);

		if (!pointer.dragging) {
			if (absX < 10 && absY < 10) return false;
			pointer.moved = true;
			if (absY > absX) return false;
			pointer.dragging = true;
		}

		event.preventDefault();
		updateDrag(deltaX);
		return true;
	};

	const handlePointerMove = (event) => {
		moveDrag(event, "pointer");
	};

	const endDrag = async (event, source) => {
		const pointer = pointerRef.current;
		if (!pointer || pointer.source !== source) return;
		if (source === "pointer" && pointer.id !== event.pointerId) return;

		const finalAction = pointer.action;
		const shouldOpen = !pointer.moved && !pointer.dragging;

		if (
			source === "pointer" &&
			event.currentTarget.hasPointerCapture(event.pointerId)
		) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		resetDrag();

		if (finalAction) {
			await onStatusChange(appointment, finalAction);
			return;
		}
		if (shouldOpen) onOpen(appointment);
	};

	const handlePointerEnd = async (event) => {
		await endDrag(event, "pointer");
	};

	const handleMouseDown = (event) => {
		if (typeof window !== "undefined" && window.PointerEvent) return;
		if (isSaving || event.button !== 0) return;
		pointerRef.current = {
			id: "mouse",
			source: "mouse",
			startX: event.clientX,
			startY: event.clientY,
			dragging: false,
			moved: false,
			action: null,
		};
	};

	const handleMouseMove = (event) => {
		if (typeof window !== "undefined" && window.PointerEvent) return;
		moveDrag(event, "mouse");
	};

	const handleMouseUp = async (event) => {
		if (typeof window !== "undefined" && window.PointerEvent) return;
		await endDrag(event, "mouse");
	};

	const handleKeyDown = (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		onOpen(appointment);
	};

	const actionLabel =
		dragAction === "paid" ? "solte para marcar pago"
		: dragAction === "fiado" ? "solte para marcar fiado"
		: "arraste: fiado para esquerda, pago para direita";

	return (
		<div className="relative overflow-hidden rounded-lg">
			<div className="absolute inset-0 grid grid-cols-2 overflow-hidden rounded-lg border border-border">
				<div className="flex items-center justify-start bg-fiado/20 px-4 font-mono-ui text-[10px] uppercase text-fiado">
					Fiado
				</div>
				<div className="flex items-center justify-end bg-paid/20 px-4 font-mono-ui text-[10px] uppercase text-paid">
					Pago
				</div>
			</div>
			<button
				type="button"
				aria-label={`${appointment.client_name}. ${actionLabel}`}
				disabled={isSaving}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerEnd}
				onPointerCancel={resetDrag}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onKeyDown={handleKeyDown}
				style={{
					transform: `translateX(${dragX}px)`,
					touchAction: "pan-y",
				}}
				className={`relative grid min-h-[76px] w-full grid-cols-[58px_1fr_auto] items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left shadow-sm transition-[border-color,background-color,transform,opacity] hover:border-paid/35 hover:bg-paid/5 ${
					isSaving ? "cursor-wait opacity-70" : "cursor-grab active:cursor-grabbing"
				}`}>
				<div className="flex h-full flex-col items-center justify-center rounded-md bg-background-deep px-2">
					<span className="font-value text-sm tabular-nums text-foreground">
						{String(appointment.time_slot || "").slice(0, 5) || "--:--"}
					</span>
				</div>
				<div className="min-w-0">
					<p className="truncate font-client text-sm font-semibold text-foreground">
						{appointment.client_name}
					</p>
					<p className="mt-1 truncate font-mono-ui text-[10px] text-foreground-faint">
						{getAppointmentSummary(appointment)} ·{" "}
						{formatCurrency(Number(appointment.value || 0))}
						{appointment.status === "fiado" && appointment.prazo_date ?
							` · Fiado ate ${formatFiadoLabel(appointment.prazo_date)}`
						:	""}
					</p>
				</div>
				<span
					className={`shrink-0 rounded-full border px-2 py-0.5 font-mono-ui text-[9px] uppercase ${
						appointment.status === "paid" ?
							"border-paid/40 bg-paid/20 text-paid"
						: appointment.status === "fiado" ?
							"border-fiado/40 bg-fiado/15 text-fiado"
						:	"border-border bg-background-deep text-foreground-faint"
					}`}>
					{isSaving ? "salvando" : getStatusLabel(appointment.status)}
				</span>
			</button>
		</div>
	);
});

export function AppointmentsList({
	appointments,
	children,
	isLoading,
	savingStatusId,
	onCreate,
	onOpen,
	onStatusChange,
}) {
	return (
		<>
			<div className="mb-3 flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Clientes agendados
					</p>
					<p className="mt-0.5 truncate font-client text-sm text-foreground">
						{appointments.length === 0 ?
							"Nenhum horário lançado"
						:	`${appointments.length} na agenda do dia`}
					</p>
				</div>
				<button
					type="button"
					onClick={onCreate}
					className="shrink-0 rounded-md bg-foreground px-4 py-2.5 font-mono-ui text-xs text-primary-foreground transition-transform active:scale-[0.98]">
					+ Cliente
				</button>
			</div>

			{children}

			{isLoading && appointments.length === 0 && (
				<p className="mb-3 rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] uppercase text-foreground-faint">
					Atualizando agenda...
				</p>
			)}

			{appointments.length === 0 ?
				<div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/35 px-5 py-8 text-center">
					<p className="font-logo text-xl text-foreground">
						Nenhum cliente agendado
					</p>
					<p className="mt-2 max-w-[280px] font-client text-sm text-foreground-faint">
						Adicione o cliente e informe o horário manualmente no atendimento.
					</p>
					<button
						type="button"
						onClick={onCreate}
						className="mt-5 rounded-md bg-foreground px-5 py-3 font-mono-ui text-xs text-primary-foreground transition-transform active:scale-[0.98]">
						+ Adicionar cliente
					</button>
				</div>
			:	<div className="space-y-2 pb-2">
					{appointments.map((appointment) => (
						<AppointmentSwipeRow
							key={appointment.id}
							appointment={appointment}
							isSaving={savingStatusId === appointment.id}
							onOpen={onOpen}
							onStatusChange={onStatusChange}
						/>
					))}
				</div>
			}
		</>
	);
}
