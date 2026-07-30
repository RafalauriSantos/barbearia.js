import { memo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/store";

const SWIPE_STATUS_THRESHOLD = 72;
const SWIPE_STATUS_MAX_OFFSET = 116;

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function formatPriceDisplay(value) {
	const num = Number(value || 0);
	if (Number.isInteger(num)) {
		return `R$ ${num}`;
	}
	return formatCurrency(num);
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
	const [isExpanded, setIsExpanded] = useState(false);

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
		const shouldTap = !pointer.moved && !pointer.dragging;

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
		if (shouldTap) {
			setIsExpanded((prev) => !prev);
			onOpen(appointment);
		}
	};

	const handlePointerEnd = async (event) => {
		await endDrag(event, "pointer");
	};

	const handleMouseDown = (event) => {
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
		moveDrag(event, "mouse");
	};

	const handleMouseUp = async (event) => {
		await endDrag(event, "mouse");
	};

	const handleKeyDown = (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		setIsExpanded((prev) => !prev);
	};

	const statusClass =
		appointment.status === "paid" || appointment.status === "confirmado" ?
			"confirmado"
		: appointment.status === "fiado" ?
			"fiado"
		:	"pending";

	const timeLabel = String(appointment.time_slot || "").slice(0, 5) || "--:--";
	const summaryText = getAppointmentSummary(appointment);

	return (
		<div className="relative overflow-hidden">
			<div className="absolute inset-0 grid grid-cols-2 overflow-hidden border-b border-[var(--card-line)]">
				<div className="flex items-center justify-start bg-[var(--amber)]/20 px-4 font-mono-ui text-[10px] font-bold uppercase text-[var(--amber)]">
					Fiado
				</div>
				<div className="flex items-center justify-end bg-[var(--green)]/20 px-4 font-mono-ui text-[10px] font-bold uppercase text-[var(--green)]">
					Pago
				</div>
			</div>
			<div
				tabIndex={0}
				role="button"
				aria-label={appointment.client_name}
				aria-expanded={isExpanded}
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
				className={`row-agenda ${statusClass} ${isExpanded ? "expanded" : ""} relative bg-[var(--bg)] transition-transform ${
					isSaving ? "opacity-60 cursor-wait" : ""
				}`}>
				<div className="time-chip">{timeLabel}</div>
				<div className="status-dot" />
				<div className="info-agenda">
					<div className="name-line">
						<div className="name-agenda">{appointment.client_name}</div>
						<div className="price-agenda">
							{formatCurrency(Number(appointment.value || 0))}
						</div>
					</div>
					<div
						className="services-agenda"
						onClick={(e) => {
							e.stopPropagation();
							onOpen(appointment);
						}}>
						{summaryText}
					</div>
				</div>
			</div>
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
	const countText = `${appointments.length} cliente${appointments.length === 1 ? "" : "s"}`;

	return (
		<>
			<div className="section-head">
				<div className="title">
					Agenda do dia <span>· {countText}</span>
					<span className="sr-only">
						{appointments.length === 0 ?
							"Nenhum horário lançado"
						:	`${appointments.length} na agenda do dia`}
					</span>
				</div>
				<button type="button" onClick={onCreate} className="add-btn">
					+ Cliente
				</button>
			</div>

			{children}

			{isLoading && appointments.length === 0 && (
				<p className="px-4 py-2 font-mono-ui text-[11px] text-[var(--gray)]">
					Atualizando agenda...
				</p>
			)}

			{appointments.length === 0 ?
				<div className="flex min-h-[200px] flex-col items-center justify-center px-4 py-8 text-center">
					<p className="font-logo text-lg text-[var(--white)]">
						Nenhum cliente agendado
					</p>
					<p className="mt-2 max-w-[280px] font-client text-xs text-[var(--gray)]">
						Adicione um cliente tocando em + Cliente acima.
					</p>
					<button
						type="button"
						onClick={onCreate}
						className="add-btn mt-4">
						+ Adicionar cliente
					</button>
				</div>
			:	<div className="list-agenda">
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

