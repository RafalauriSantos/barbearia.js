import { useEffect, useMemo, useState } from "react";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import {
	EmptyState,
	IconButton,
	Notice,
} from "@/components/ScreenPrimitives";
import { addBarber, formatCurrency, sendBarberInvite } from "@/lib/store";

const SLOT_START_MINUTES = 9 * 60;
const SLOT_END_MINUTES = 20 * 60;
const SLOT_STEP_MINUTES = 30;

function statusLabel(status) {
	if (status === "paid") return "Pago";
	if (status === "fiado") return "Fiado";
	return "Aberto";
}

function statusTone(status) {
	if (status === "paid") return "border-paid/30 bg-paid/10 text-paid";
	if (status === "fiado") return "border-fiado/30 bg-fiado/10 text-fiado";
	return "border-border bg-secondary text-foreground-faint";
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

function accessLabel(barber) {
	if (barber.usuario_id) return "Acesso ativo";
	if (barber.convite_pendente) return "Convite pendente";
	return "Sem acesso";
}

function accessTone(barber) {
	if (barber.usuario_id) return "border-paid/30 bg-paid/10 text-paid";
	if (barber.convite_pendente) return "border-fiado/30 bg-fiado/10 text-fiado";
	return "border-overdue/30 bg-overdue/10 text-overdue";
}

function toTimeLabel(totalMinutes) {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function toMinutes(time) {
	const [hours, minutes] = String(time || "00:00")
		.slice(0, 5)
		.split(":")
		.map(Number);
	return hours * 60 + minutes;
}

function getSlots() {
	const slots = [];
	for (
		let minutes = SLOT_START_MINUTES;
		minutes <= SLOT_END_MINUTES;
		minutes += SLOT_STEP_MINUTES
	) {
		slots.push({ minutes, time: toTimeLabel(minutes) });
	}
	return slots;
}

function groupAppointmentsByBarber(appointments) {
	const grouped = new Map();
	for (const appointment of appointments) {
		const key = appointment.barbeiro_id || "sem-barbeiro";
		if (!grouped.has(key)) grouped.set(key, []);
		grouped.get(key).push(appointment);
	}
	for (const rows of grouped.values()) {
		rows.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
	}
	return grouped;
}

function getPaidTotal(rows) {
	return rows
		.filter((appointment) => appointment.status === "paid")
		.reduce((sum, appointment) => sum + Number(appointment.value || 0), 0);
}

function getPendingTotal(rows) {
	return rows
		.filter((appointment) => appointment.status === "fiado")
		.reduce((sum, appointment) => sum + Number(appointment.value || 0), 0);
}

function getFreeSlots(rows, slots) {
	const occupied = new Set(
		rows.map((appointment) => String(appointment.time_slot || "").slice(0, 5)),
	);
	return Math.max(slots.length - occupied.size, 0);
}

function isTodayKey(dayKey) {
	const today = new Date();
	const currentDayKey = `${today.getFullYear()}-${String(
		today.getMonth() + 1,
	).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
	return dayKey === currentDayKey;
}

function getNextAppointment(rows, dayKey) {
	if (rows.length === 0) return null;
	if (!isTodayKey(dayKey)) return rows[0];

	const now = new Date();
	const currentMinutes = now.getHours() * 60 + now.getMinutes();
	return (
		rows.find(
			(appointment) => toMinutes(appointment.time_slot) >= currentMinutes,
		) || null
	);
}

function getAppointmentsByTime(rows) {
	const map = new Map();
	for (const appointment of rows) {
		map.set(String(appointment.time_slot || "").slice(0, 5), appointment);
	}
	return map;
}

function BarberMetric({ label, value, tone = "default" }) {
	const tones = {
		default: "bg-background-deep text-foreground",
		paid: "bg-paid/10 text-paid",
		fiado: "bg-fiado/10 text-fiado",
	};

	return (
		<div className={`min-w-0 rounded-md px-2 py-2 ${tones[tone]}`}>
			<p className="truncate font-mono-ui text-[9px] uppercase text-foreground-faint">
				{label}
			</p>
			<p className="mt-1 truncate font-value text-sm leading-none">{value}</p>
		</div>
	);
}

function AppointmentPreview({ appointment }) {
	return (
		<div className="rounded-md border border-border bg-background-deep px-3 py-2">
			<div className="flex items-center justify-between gap-2">
				<p className="font-mono-ui text-xs text-foreground">
					{String(appointment.time_slot || "").slice(0, 5)}
				</p>
				<span
					className={`rounded-full border px-2 py-0.5 font-mono-ui text-[9px] ${statusTone(
						appointment.status,
					)}`}>
					{statusLabel(appointment.status)}
				</span>
			</div>
			<p className="mt-1 truncate font-client text-sm text-foreground">
				{appointment.client_name}
			</p>
		</div>
	);
}

function BarberCard({ barber, rows, slots, dayKey, onSelect, onAdd }) {
	const nextAppointment = getNextAppointment(rows, dayKey);
	const freeSlots = getFreeSlots(rows, slots);

	return (
		<article className="rounded-lg border border-border bg-card p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex min-w-0 items-center gap-2">
						<p className="truncate font-logo text-xl leading-tight text-foreground">
							{barber.name}
						</p>
						<span
							className={`shrink-0 rounded-full border px-2 py-0.5 font-mono-ui text-[9px] ${accessTone(
								barber,
							)}`}>
							{accessLabel(barber)}
						</span>
					</div>
					<p className="mt-1 truncate font-client text-sm text-foreground-faint">
						{nextAppointment ?
							`Próximo ${String(nextAppointment.time_slot || "").slice(0, 5)} · ${
								nextAppointment.client_name
							}`
						:	"Sem próximos atendimentos"}
					</p>
				</div>
				<IconButton
					label={`Adicionar cliente para ${barber.name}`}
					onClick={() => onAdd(barber.id)}
					tone="primary">
					+
				</IconButton>
			</div>

			<div className="mt-3 grid grid-cols-3 gap-2">
				<BarberMetric label="Hoje" value={rows.length} />
				<BarberMetric label="Livres" value={freeSlots} />
				<BarberMetric
					label="Recebido"
					value={formatCurrency(getPaidTotal(rows))}
					tone="paid"
				/>
			</div>

			<div className="mt-3 space-y-2">
				{rows.length === 0 ?
					<p className="rounded-md border border-dashed border-border bg-background-deep px-3 py-4 text-center font-mono-ui text-[10px] text-foreground-faint">
						Agenda livre neste dia
					</p>
				:	rows
						.slice(0, 2)
						.map((appointment) => (
							<AppointmentPreview
								key={appointment.id}
								appointment={appointment}
							/>
						))
				}
			</div>

			<button
				type="button"
				onClick={() => onSelect(barber.id)}
				className="mt-3 w-full rounded-md border border-border bg-background-deep px-4 py-3 font-mono-ui text-xs text-foreground transition-colors hover:bg-secondary">
				Ver agenda do barbeiro
			</button>
		</article>
	);
}

function BarberAgenda({ barber, rows, slots, onBack, onAdd, onEdit }) {
	const appointmentsByTime = getAppointmentsByTime(rows);

	return (
		<section className="px-4 pb-6">
			<div className="mb-3 flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Agenda do barbeiro
					</p>
					<h2 className="truncate font-logo text-xl text-foreground">
						{barber.name}
					</h2>
				</div>
				<button
					type="button"
					onClick={onBack}
					className="rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] text-foreground">
					Todos
				</button>
			</div>

			<div className="space-y-1.5">
				{slots.map((slot) => {
					const appointment = appointmentsByTime.get(slot.time);

					return (
						<div key={slot.time} className="grid grid-cols-[52px_1fr] gap-2">
							<div className="pt-3 font-mono-ui text-xs text-foreground-faint">
								{slot.time}
							</div>
							{appointment ?
								<button
									type="button"
									onClick={() => onEdit(appointment)}
									className="min-h-[58px] rounded-lg border border-paid/25 bg-[hsl(var(--status-paid-bg))] px-3 py-2 text-left">
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0">
											<p className="truncate font-client text-sm font-semibold text-foreground">
												{appointment.client_name}
											</p>
											<p className="mt-1 truncate font-mono-ui text-[10px] text-foreground-faint">
												{getAppointmentSummary(appointment)} ·{" "}
												{formatCurrency(Number(appointment.value || 0))}
											</p>
										</div>
										<span
											className={`shrink-0 rounded-full border px-2 py-0.5 font-mono-ui text-[9px] ${statusTone(
												appointment.status,
											)}`}>
											{statusLabel(appointment.status)}
										</span>
									</div>
								</button>
							:	<button
									type="button"
									onClick={() => onAdd(barber.id, slot.time)}
									className="grid min-h-[52px] grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-dashed border-border bg-card/45 px-3 py-2 text-left transition-colors hover:border-paid/40 hover:bg-paid/5">
									<span className="font-mono-ui text-[10px] uppercase text-foreground-faint">
										Livre · adicionar cliente
									</span>
									<span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background-deep font-mono-ui text-base text-paid">
										+
									</span>
								</button>
							}
						</div>
					);
				})}
			</div>
		</section>
	);
}

export function AdminDashboard({
	dayKey,
	barbers,
	appointments,
	isLoading,
	errorMessage,
	onRetry,
	onReload,
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [teamSheetOpen, setTeamSheetOpen] = useState(false);
	const [editingAppt, setEditingAppt] = useState();
	const [defaultBarberId, setDefaultBarberId] = useState("");
	const [defaultTimeSlot, setDefaultTimeSlot] = useState("09:00");
	const [activeBarberId, setActiveBarberId] = useState("all");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [commission, setCommission] = useState("50");
	const [sendInviteNow, setSendInviteNow] = useState(true);
	const [isSubmittingBarber, setIsSubmittingBarber] = useState(false);
	const [panelMessage, setPanelMessage] = useState("");
	const [panelError, setPanelError] = useState("");
	const slots = useMemo(() => getSlots(), []);

	const grouped = useMemo(
		() => groupAppointmentsByBarber(appointments),
		[appointments],
	);

	const selectedBarber =
		activeBarberId === "all" ? null : (
			barbers.find((barber) => barber.id === activeBarberId) || null
		);
	const nextTeamAppointment = getNextAppointment(appointments, dayKey);
	const totalSlots = slots.length * barbers.length;
	const freeSlots = Math.max(totalSlots - appointments.length, 0);
	const paidTotal = getPaidTotal(appointments);
	const pendingTotal = getPendingTotal(appointments);

	useEffect(() => {
		if (
			activeBarberId !== "all" &&
			!barbers.some((barber) => barber.id === activeBarberId)
		) {
			setActiveBarberId("all");
		}
	}, [activeBarberId, barbers]);

	const openNewForBarber = (barberId = "", timeSlot = "09:00") => {
		setDefaultBarberId(barberId);
		setDefaultTimeSlot(timeSlot);
		setEditingAppt(undefined);
		setDialogOpen(true);
	};

	const openEdit = (appointment) => {
		setDefaultBarberId(appointment.barbeiro_id || "");
		setDefaultTimeSlot(String(appointment.time_slot || "09:00").slice(0, 5));
		setEditingAppt(appointment);
		setDialogOpen(true);
	};

	const handleCreateBarber = async (event) => {
		event.preventDefault();
		if (isSubmittingBarber) return;

		setIsSubmittingBarber(true);
		setPanelMessage("");
		setPanelError("");
		try {
			const created = await addBarber({
				nome: name.trim(),
				email: email.trim() || undefined,
				comissao_percent: Number(commission || 50),
				send_invite: sendInviteNow,
			});
			setName("");
			setEmail("");
			setCommission("50");
			setSendInviteNow(true);
			setPanelMessage(
				created.inviteUrl ?
					"Barbeiro salvo. Enviamos o convite por email."
				:	"Barbeiro salvo.",
			);
			await onReload();
		} catch (error) {
			setPanelError(error.message || "Nao foi possivel salvar o barbeiro.");
		} finally {
			setIsSubmittingBarber(false);
		}
	};

	const handleInvite = async (barber) => {
		if (!barber.email) {
			setPanelError("Informe um email para este barbeiro antes de convidar.");
			return;
		}

		setPanelMessage("");
		setPanelError("");
		try {
			const result = await sendBarberInvite(barber.id, { email: barber.email });
			setPanelMessage(
				result.inviteUrl ? "Convite enviado por email." : "Convite enviado.",
			);
			await onReload();
		} catch (error) {
			setPanelError(error.message || "Nao foi possivel enviar convite.");
		}
	};

	return (
		<>
			<div className="min-h-0 flex-1 overflow-y-auto pb-4">
				{errorMessage && (
					<div className="mx-4 mb-3 rounded-lg border border-overdue/30 bg-overdue/10 px-4 py-3">
						<p className="font-mono-ui text-[10px] uppercase text-overdue">
							Erro
						</p>
						<p className="mt-1 font-client text-sm leading-snug text-overdue">
							{errorMessage}
						</p>
						<button
							onClick={onRetry}
							className="mt-3 rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground">
							Tentar novamente
						</button>
					</div>
				)}

				<section className="px-4 py-3">
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
								Equipe
							</p>
							<h1 className="truncate font-logo text-xl leading-tight text-foreground">
								Agenda dos barbeiros
							</h1>
						</div>
						<IconButton
							label="Gerenciar equipe"
							type="button"
							onClick={() => setTeamSheetOpen(true)}>
							∷
						</IconButton>
					</div>

					<div className="mt-3 grid grid-cols-2 gap-2">
						<BarberMetric label="Barbeiros" value={barbers.length} />
						<BarberMetric label="Atendimentos" value={appointments.length} />
						<BarberMetric label="Livres" value={freeSlots} />
						<BarberMetric
							label="Próximo"
							value={
								nextTeamAppointment ?
									String(nextTeamAppointment.time_slot || "").slice(0, 5)
								:	"--"
							}
						/>
					</div>

					<div className="mt-2 grid grid-cols-2 gap-2">
						<BarberMetric
							label="Recebido"
							value={formatCurrency(paidTotal)}
							tone="paid"
						/>
						<BarberMetric
							label="A cobrar"
							value={formatCurrency(pendingTotal)}
							tone="fiado"
						/>
					</div>

					{barbers.length > 0 && (
						<div className="mt-3 flex gap-2 overflow-x-auto pb-1">
							<button
								type="button"
								onClick={() => setActiveBarberId("all")}
								className={`shrink-0 rounded-full border px-3 py-2 font-mono-ui text-[10px] ${
									activeBarberId === "all" ?
										"border-paid/40 bg-paid/10 text-paid"
									:	"border-border bg-card text-foreground-faint"
								}`}>
								Todos · {appointments.length}
							</button>
							{barbers.map((barber) => {
								const count = (grouped.get(barber.id) || []).length;
								return (
									<button
										type="button"
										key={barber.id}
										onClick={() => setActiveBarberId(barber.id)}
										className={`shrink-0 rounded-full border px-3 py-2 font-mono-ui text-[10px] ${
											activeBarberId === barber.id ?
												"border-paid/40 bg-paid/10 text-paid"
											:	"border-border bg-card text-foreground-faint"
										}`}>
										{barber.name} · {count}
									</button>
								);
							})}
						</div>
					)}
				</section>

				{selectedBarber && (
					<BarberAgenda
						barber={selectedBarber}
						rows={grouped.get(selectedBarber.id) || []}
						slots={slots}
						onBack={() => setActiveBarberId("all")}
						onAdd={openNewForBarber}
						onEdit={openEdit}
					/>
				)}

				{!selectedBarber && (
					<section className="grid gap-3 px-4 pb-6 lg:grid-cols-2">
						{isLoading && barbers.length === 0 && (
							<p className="rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] uppercase text-foreground-faint lg:col-span-2">
								Atualizando equipe...
							</p>
						)}
						{barbers.length === 0 ?
							<EmptyState
								title="Nenhum barbeiro da equipe cadastrado"
								hint="Cadastre barbeiros para consultar a agenda da equipe."
								action={
									<IconButton
										label="Gerenciar equipe"
										onClick={() => setTeamSheetOpen(true)}
										tone="primary">
										+
									</IconButton>
								}
							/>
						:	barbers.map((barber) => (
								<BarberCard
									key={barber.id}
									barber={barber}
									rows={grouped.get(barber.id) || []}
									slots={slots}
									dayKey={dayKey}
									onSelect={setActiveBarberId}
									onAdd={openNewForBarber}
								/>
							))
						}
					</section>
				)}
			</div>

			{teamSheetOpen && (
				<div
					className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm"
					onClick={() => setTeamSheetOpen(false)}>
					<div
						className="max-h-[92dvh] w-full max-w-[480px] overflow-y-auto rounded-t-lg border-x border-t border-border bg-background"
						onClick={(event) => event.stopPropagation()}>
						<div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-4 backdrop-blur">
							<div>
								<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
									Equipe
								</p>
								<h2 className="font-logo text-lg text-foreground">
									Gerenciar equipe
								</h2>
							</div>
							<IconButton
								label="Fechar"
								type="button"
								onClick={() => setTeamSheetOpen(false)}>
								×
							</IconButton>
						</div>

						<div className="space-y-3 px-4 py-4">
							<form
								onSubmit={handleCreateBarber}
								className="space-y-3 rounded-lg border border-border bg-card p-4">
								<div className="flex items-center justify-between gap-3">
									<div>
										<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
											Novo barbeiro
										</p>
										<p className="mt-1 font-client text-sm text-foreground-faint">
											Cadastre e envie convite de acesso.
										</p>
									</div>
									<span className="rounded-full border border-border bg-background-deep px-2.5 py-1 font-mono-ui text-[10px] text-foreground-faint">
										{barbers.length} no time
									</span>
								</div>

								<div>
									<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
										Nome
									</label>
									<input
										value={name}
										onChange={(event) => setName(event.target.value)}
										className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
										placeholder="Ex: João"
										required
										disabled={isSubmittingBarber}
									/>
								</div>
								<div>
									<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
										Email de acesso
									</label>
									<input
										type="email"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
										placeholder="barbeiro@email.com"
										disabled={isSubmittingBarber}
									/>
								</div>
								<div className="grid grid-cols-[1fr_auto] gap-3">
									<div>
										<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
											Comissão %
										</label>
										<input
											type="number"
											min="0"
											max="100"
											value={commission}
											onChange={(event) => setCommission(event.target.value)}
											className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
											disabled={isSubmittingBarber}
										/>
									</div>
									<label className="flex items-end gap-2 pb-3 font-mono-ui text-[10px] text-foreground-faint">
										<input
											type="checkbox"
											checked={sendInviteNow}
											onChange={(event) =>
												setSendInviteNow(event.target.checked)
											}
											disabled={isSubmittingBarber || !email}
										/>
										Convidar
									</label>
								</div>
								<button
									type="submit"
									disabled={isSubmittingBarber}
									className="w-full rounded-md bg-foreground px-4 py-3 font-mono-ui text-xs text-primary-foreground disabled:opacity-60">
									{isSubmittingBarber ? "Salvando..." : "Adicionar barbeiro"}
								</button>
							</form>

							{(panelMessage || panelError) && (
								<Notice tone={panelError ? "error" : "success"}>
									{panelError || panelMessage}
								</Notice>
							)}

							<div className="space-y-2">
								{barbers.map((barber) => (
									<div
										key={barber.id}
										className="rounded-lg border border-border bg-card p-3">
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate font-client text-sm text-foreground">
													{barber.name}
												</p>
												<p className="mt-1 truncate font-mono-ui text-[10px] text-foreground-faint">
													{barber.email || "sem email"}
												</p>
											</div>
											<span
												className={`shrink-0 rounded-full border px-2 py-1 font-mono-ui text-[9px] ${accessTone(barber)}`}>
												{accessLabel(barber)}
											</span>
										</div>
										<div className="mt-3 flex items-center justify-between gap-2">
											<p className="font-mono-ui text-[10px] text-foreground-faint">
												Comissão {barber.comissao_percent}%
											</p>
											<button
												type="button"
												onClick={() => handleInvite(barber)}
												disabled={Boolean(barber.usuario_id)}
												className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint disabled:opacity-40">
												Convite
											</button>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			{dialogOpen && (
				<AppointmentDialog
					dayKey={dayKey}
					appointment={editingAppt}
					barbers={barbers}
					canChooseBarber
					defaultBarberId={defaultBarberId}
					defaultTimeSlot={defaultTimeSlot}
					onClose={() => setDialogOpen(false)}
					onSave={onReload}
					onError={setPanelError}
				/>
			)}
		</>
	);
}
