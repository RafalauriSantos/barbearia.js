import React, { memo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/store";

const SWIPE_STATUS_THRESHOLD = 50;
const SWIPE_STATUS_MAX_OFFSET = 116;

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export interface AppointmentItem {
	id: string;
	client_name: string;
	client_phone?: string;
	time_slot?: string;
	value?: number;
	status?: "pending" | "paid" | "fiado" | "confirmado" | string;
	service_name?: string;
	services?: Array<{ name: string; price?: number }>;
	products?: Array<{ name: string; quantity: number; price?: number }>;
	barber_name?: string;
	barbeiro_id?: string;
	payment_method_id?: string | null;
	prazo_date?: string | null;
}

function getAppointmentSummary(appointment: AppointmentItem): string {
	const services = Array.isArray(appointment.services) ? appointment.services : [];
	const products = Array.isArray(appointment.products) ? appointment.products : [];
	const serviceNames = services.map((item) => item.name).filter(Boolean);
	const productNames = products
		.map((item) => (item.quantity > 1 ? `${item.quantity}x ${item.name}` : item.name))
		.filter(Boolean);
	const names = [...serviceNames, ...productNames].filter(Boolean);
	if (names.length > 0) return names.join(", ");
	return appointment.service_name || "Atendimento";
}

interface PointerState {
	startX: number;
	startY: number;
	dragging: boolean;
	moved: boolean;
	action: "paid" | "fiado" | null;
	lastDx: number;
}

interface AppointmentSwipeRowProps {
	appointment: AppointmentItem;
	isSaving?: boolean;
	onOpen: (appointment: AppointmentItem) => void;
	onStatusChange: (appointment: AppointmentItem, nextStatus: "paid" | "fiado") => Promise<void> | void;
}

const AppointmentSwipeRow = memo(function AppointmentSwipeRow({
	appointment,
	isSaving,
	onOpen,
	onStatusChange,
}: AppointmentSwipeRowProps) {
	const pointerRef = useRef<PointerState | null>(null);
	const [dragX, setDragX] = useState<number>(0);
	const [dragAction, setDragAction] = useState<"paid" | "fiado" | null>(null);
	const [isExpanded, setIsExpanded] = useState<boolean>(false);

	const resetDrag = () => {
		pointerRef.current = null;
		setDragX(0);
		setDragAction(null);
	};

	const updateDrag = (nextX: number) => {
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
			pointerRef.current.lastDx = clampedX;
		}
		setDragX(clampedX);
		setDragAction(nextAction);
	};

	const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
		if (isSaving) return;
		pointerRef.current = {
			startX: event.clientX,
			startY: event.clientY,
			dragging: false,
			moved: false,
			action: null,
			lastDx: 0,
		};
	};

	const moveDrag = (event: { clientX: number; clientY: number }) => {
		const pointer = pointerRef.current;
		if (!pointer) return;

		const dx = event.clientX - pointer.startX;
		const dy = event.clientY - pointer.startY;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);

		if (!pointer.dragging) {
			if (absDx < 6 && absDy < 6) return;
			if (absDy > absDx) {
				resetDrag();
				return;
			}
			pointer.dragging = true;
		}

		pointer.moved = true;
		pointer.lastDx = dx;
		updateDrag(dx);
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
		moveDrag(event);
	};

	const endDrag = async () => {
		const pointer = pointerRef.current;
		if (!pointer) return;

		const dx = pointer.lastDx || dragX;
		const finalAction =
			pointer.action ||
			dragAction ||
			(dx >= SWIPE_STATUS_THRESHOLD ? "paid"
			: dx <= -SWIPE_STATUS_THRESHOLD ? "fiado"
			: null);
		const shouldTap = !pointer.moved;

		resetDrag();

		if (finalAction === "fiado" || finalAction === "paid") {
			await onStatusChange(appointment, finalAction);
			return;
		}
		if (shouldTap) {
			setIsExpanded((prev) => !prev);
			onOpen(appointment);
		}
	};

	const handlePointerEnd = async () => {
		await endDrag();
	};

	const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
		if (pointerRef.current) return;
		if (isSaving || event.button !== 0) return;
		pointerRef.current = {
			startX: event.clientX,
			startY: event.clientY,
			dragging: false,
			moved: false,
			action: null,
			lastDx: 0,
		};
	};

	const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
		moveDrag(event);
	};

	const handleMouseUp = async () => {
		await endDrag();
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		setIsExpanded((prev) => !prev);
	};

	const actionLabel =
		dragAction === "paid" ? "solte para marcar pago"
		: dragAction === "fiado" ? "solte para marcar fiado"
		: "arraste: fiado para esquerda, pago para direita";

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
			<button
				type="button"
				aria-label={`${appointment.client_name}. ${actionLabel}`}
				aria-expanded={isExpanded}
				disabled={isSaving}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerEnd}
				onPointerCancel={handlePointerEnd}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseUp}
				onKeyDown={handleKeyDown}
				style={{
					transform: `translateX(${dragX}px)`,
					touchAction: "pan-y",
				}}
				className={`row-agenda ${statusClass} ${isExpanded ? "expanded" : ""} relative w-full text-left bg-[var(--bg)] transition-transform ${
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
					<div className="services-agenda">{summaryText}</div>
				</div>
			</button>
		</div>
	);
});

export interface AppointmentsListProps {
	appointments: AppointmentItem[];
	children?: React.ReactNode;
	isLoading?: boolean;
	savingStatusId?: string | null;
	onCreate: () => void;
	onOpen: (appointment: AppointmentItem) => void;
	onStatusChange: (appointment: AppointmentItem, nextStatus: "paid" | "fiado") => Promise<void> | void;
}

export function AppointmentsList({
	appointments,
	children,
	isLoading,
	savingStatusId,
	onCreate,
	onOpen,
	onStatusChange,
}: AppointmentsListProps) {
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
