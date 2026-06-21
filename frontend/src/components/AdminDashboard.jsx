import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Copy, Plus, UsersRound, X } from "lucide-react";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { EmptyState, IconButton, Notice } from "@/components/ScreenPrimitives";
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
	if (barber.usuario_id) return "Acesso liberado";
	if (barber.convite_pendente) return "Acesso pendente";
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

function getInitials(name) {
	const parts = String(name || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function TeamBarberRow({ barber, rows, dayKey, onSelect, onAdd }) {
	const nextAppointment = getNextAppointment(rows, dayKey);
	const accessDot =
		barber.usuario_id ? "bg-paid"
		: barber.convite_pendente ? "bg-fiado"
		: "bg-overdue";
	const accessText =
		barber.usuario_id ? "text-paid"
		: barber.convite_pendente ? "text-fiado"
		: "text-overdue";

	return (
		<article className="grid min-h-[92px] grid-cols-[40px_minmax(82px,0.95fr)_minmax(64px,1fr)_auto] items-center gap-1.5 px-3 py-3 sm:min-h-[96px] sm:grid-cols-[48px_minmax(110px,0.9fr)_minmax(140px,1.2fr)_auto] sm:gap-4 sm:px-5">
			<div className="flex h-10 w-10 items-center justify-center rounded-full bg-paid/10 font-logo text-sm text-foreground sm:h-12 sm:w-12 sm:text-base">
				{getInitials(barber.name)}
			</div>
			<div className="contents">
				<div className="min-w-0">
				<p className="truncate font-client text-[13px] font-semibold text-foreground sm:text-sm">
						{barber.name}
					</p>
				<p className={`mt-1 flex min-w-0 items-center gap-1.5 font-client text-[9px] sm:text-xs ${accessText}`}>
					<span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${accessDot}`} />
					<span className="whitespace-nowrap">{accessLabel(barber)}</span>
				</p>
				<p className="mt-1.5 whitespace-nowrap font-client text-[8px] text-foreground-faint sm:text-[10px]">
					Próximo atendimento
				</p>
				</div>
				<div className="min-w-0 border-l border-border pl-2 sm:pl-4">
					{nextAppointment ?
						<>
						<p className="font-value text-[11px] tabular-nums text-foreground sm:text-xs">
								{String(nextAppointment.time_slot || "").slice(0, 5)}
							</p>
						<p className="mt-1 truncate font-client text-[11px] text-foreground sm:text-xs">
								{nextAppointment.client_name}
							</p>
							<p className="mt-1 truncate font-client text-[10px] text-foreground-faint sm:text-xs">
								{getAppointmentSummary(nextAppointment)}
							</p>
						</>
					:	<>
						<p className="font-client text-[11px] font-medium text-foreground sm:text-xs">
								Agenda livre
							</p>
							<p className="mt-1 text-xs text-foreground-faint">—</p>
						</>
					}
				</div>
			<div className="flex items-center gap-0 border-l border-border pl-1 sm:gap-2 sm:pl-3">
				<span className="hidden whitespace-nowrap font-client text-[10px] text-foreground-faint min-[380px]:block sm:text-xs">
						{rows.length} hoje
					</span>
					<IconButton
						label={`Adicionar cliente para ${barber.name}`}
						onClick={() => onAdd(barber.id)}
						tone="quiet"
					className="h-8 w-8 text-paid hover:text-paid sm:h-9 sm:w-9">
						<Plus aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
					</IconButton>
					<IconButton
						label={`Abrir agenda de ${barber.name}`}
						onClick={() => onSelect(barber.id)}
						tone="quiet"
					className="h-8 w-8 text-foreground sm:h-9 sm:w-9">
						<ChevronRight aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
					</IconButton>
				</div>
			</div>

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
					Voltar
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
	teamSheetOpen: controlledTeamSheetOpen,
	onTeamSheetOpenChange,
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [internalTeamSheetOpen, setInternalTeamSheetOpen] = useState(false);
	const teamSheetOpen = controlledTeamSheetOpen ?? internalTeamSheetOpen;
	const setTeamSheetOpen = onTeamSheetOpenChange ?? setInternalTeamSheetOpen;
	const [editingAppt, setEditingAppt] = useState();
	const [defaultBarberId, setDefaultBarberId] = useState("");
	const [defaultTimeSlot, setDefaultTimeSlot] = useState("09:00");
	const [activeBarberId, setActiveBarberId] = useState("all");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [commission, setCommission] = useState("50");
	const [sendInviteNow, setSendInviteNow] = useState(true);
	const [createFormOpen, setCreateFormOpen] = useState(false);
	const [isSubmittingBarber, setIsSubmittingBarber] = useState(false);
	const [invitingBarberId, setInvitingBarberId] = useState("");
	const [panelMessage, setPanelMessage] = useState("");
	const [panelError, setPanelError] = useState("");
	const [lastInviteUrl, setLastInviteUrl] = useState("");
	const slots = useMemo(() => getSlots(), []);

	const grouped = useMemo(
		() => groupAppointmentsByBarber(appointments),
		[appointments],
	);

	const selectedBarber =
		activeBarberId === "all" ? null : (
			barbers.find((barber) => barber.id === activeBarberId) || null
		);

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
		setLastInviteUrl("");
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
			setCreateFormOpen(false);
			setLastInviteUrl(created.inviteUrl || "");
			setPanelMessage(
				created.inviteUrl ?
					"Barbeiro salvo. Convite enviado e link pronto para copiar."
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
		if (invitingBarberId) return;
		if (!barber.email) {
			setPanelError("Informe um email para este barbeiro antes de convidar.");
			return;
		}

		setPanelMessage("");
		setPanelError("");
		setLastInviteUrl("");
		setInvitingBarberId(barber.id);
		try {
			const result = await sendBarberInvite(barber.id, { email: barber.email });
			setLastInviteUrl(result.inviteUrl || "");
			setPanelMessage(
				result.inviteUrl ?
					"Convite enviado e link pronto para copiar."
				:	"Convite enviado.",
			);
			try {
				await onReload();
			} catch {
				setPanelMessage((message) =>
					`${message} Atualize a lista para conferir o novo acesso.`,
				);
			}
		} catch (error) {
			setPanelError(error.message || "Nao foi possivel enviar convite.");
		} finally {
			setInvitingBarberId("");
		}
	};

	const handleCopyInviteLink = async () => {
		if (!lastInviteUrl) return;
		try {
			if (!navigator.clipboard?.writeText) {
				throw new Error("Clipboard API indisponivel");
			}
			await navigator.clipboard.writeText(lastInviteUrl);
			setPanelMessage("Link do convite copiado.");
		} catch {
			setPanelMessage("Selecione e copie o link do convite.");
		}
	};

	return (
		<>
			<div className="min-h-0 flex-1 overflow-y-auto safe-bottom">
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

				<section className="px-4 py-4">
					<div className="flex items-center gap-3 py-1 text-foreground-faint">
						<UsersRound aria-hidden="true" className="h-5 w-5 shrink-0 text-paid" strokeWidth={2} />
						<p className="font-client text-sm sm:text-base">
							{barbers.length} barbeiros · {appointments.length} atendimentos hoje
						</p>
					</div>

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
					<section className="px-4 pb-6">
						{isLoading && barbers.length === 0 && (
							<p className="rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] uppercase text-foreground-faint">
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
						:	<div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/30">
								{barbers.map((barber) => (
									<TeamBarberRow
										key={barber.id}
										barber={barber}
										rows={grouped.get(barber.id) || []}
										dayKey={dayKey}
										onSelect={setActiveBarberId}
										onAdd={openNewForBarber}
									/>
								))}
							</div>
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
								<X aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
							</IconButton>
						</div>

						<div className="space-y-3 px-4 py-4">
							{!createFormOpen ?
								<button
									type="button"
									onClick={() => setCreateFormOpen(true)}
									className="flex w-full items-center justify-center gap-2 rounded-md border border-paid/30 bg-paid/10 px-4 py-3 font-client text-sm font-semibold text-paid transition-colors hover:bg-paid/15">
									<Plus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
									Adicionar barbeiro
								</button>
							:	<form
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
									<label htmlFor="team-barber-name" className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
										Nome
									</label>
									<input
										id="team-barber-name"
										value={name}
										onChange={(event) => setName(event.target.value)}
										className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
										placeholder="Ex: João"
										required
										disabled={isSubmittingBarber}
									/>
								</div>
								<div>
									<label htmlFor="team-barber-email" className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
										Email de acesso
									</label>
									<input
										id="team-barber-email"
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
										<label htmlFor="team-barber-commission" className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
											Comissão %
										</label>
										<input
											id="team-barber-commission"
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
									{isSubmittingBarber ? "Salvando..." : "Salvar barbeiro"}
								</button>
							</form>
							}

							{(panelMessage || panelError) && (
								<Notice tone={panelError ? "error" : "success"}>
									{panelError || panelMessage}
								</Notice>
							)}

							{lastInviteUrl && !panelError && (
								<div className="rounded-lg border border-paid/20 bg-paid/10 p-3">
									<label className="mb-2 block font-mono-ui text-[10px] uppercase text-paid">
										Link do convite
									</label>
									<div className="grid grid-cols-[1fr_auto] gap-2">
										<input
											readOnly
											value={lastInviteUrl}
											className="min-w-0 rounded-md border border-paid/20 bg-background px-3 py-2 font-mono-ui text-[10px] text-foreground"
											onFocus={(event) => event.target.select()}
										/>
										<IconButton
											label="Copiar link do convite"
											onClick={handleCopyInviteLink}
											tone="primary">
											<Copy aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
										</IconButton>
									</div>
									<p className="mt-2 font-client text-xs leading-snug text-foreground-faint">
										Se o email demorar ou cair no spam, envie este link pelo WhatsApp.
									</p>
								</div>
							)}

							<div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/40">
								{barbers.map((barber) => (
									<div
										key={barber.id}
										className="px-3 py-3">
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
										<div className="mt-2 flex items-center justify-between gap-2">
											<p className="font-mono-ui text-[10px] text-foreground-faint">
												Comissão {barber.comissao_percent}%
											</p>
											{!barber.usuario_id && (
												<button
													type="button"
												onClick={() => handleInvite(barber)}
												disabled={Boolean(invitingBarberId)}
												className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint disabled:opacity-50">
												{invitingBarberId === barber.id ?
													"Enviando…"
												: 	"Enviar convite"}
												</button>
											)}
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
