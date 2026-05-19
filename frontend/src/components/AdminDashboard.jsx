import { useMemo, useState } from "react";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { FinancialSummaryCompact } from "@/components/FinancialSummaryCompact";
import {
	addBarber,
	formatCurrency,
	sendBarberInvite,
} from "@/lib/store";

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

function getBarberTotal(rows) {
	return rows.reduce(
		(sum, appointment) => sum + Number(appointment.value || 0),
		0,
	);
}

export function AdminDashboard({
	dayKey,
	barbers,
	appointments,
	financialSummary,
	isLoading,
	errorMessage,
	onRetry,
	onReload,
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const [teamSheetOpen, setTeamSheetOpen] = useState(false);
	const [editingAppt, setEditingAppt] = useState();
	const [defaultBarberId, setDefaultBarberId] = useState("");
	const [activeBarberId, setActiveBarberId] = useState("all");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [commission, setCommission] = useState("50");
	const [sendInviteNow, setSendInviteNow] = useState(true);
	const [isSubmittingBarber, setIsSubmittingBarber] = useState(false);
	const [panelMessage, setPanelMessage] = useState("");
	const [panelError, setPanelError] = useState("");

	const grouped = useMemo(
		() => groupAppointmentsByBarber(appointments),
		[appointments],
	);

	const visibleBarbers =
		activeBarberId === "all" ?
			barbers
		:	barbers.filter((barber) => barber.id === activeBarberId);

	const openNewForBarber = (barberId = "") => {
		setDefaultBarberId(barberId);
		setEditingAppt(undefined);
		setDialogOpen(true);
	};

	const openEdit = (appointment) => {
		setDefaultBarberId(appointment.barbeiro_id || "");
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
					`Convite criado: ${created.inviteUrl}`
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
				result.inviteUrl ?
					`Convite criado: ${result.inviteUrl}`
				:	"Convite enviado.",
			);
			await onReload();
		} catch (error) {
			setPanelError(error.message || "Nao foi possivel enviar convite.");
		}
	};

	return (
		<>
			<div className="flex-1 overflow-y-auto pb-24">
				<FinancialSummaryCompact
					summary={financialSummary}
					isLoading={isLoading}
				/>

				{errorMessage && (
					<div className="mx-4 mb-3 rounded-lg border border-overdue/30 bg-overdue/10 px-4 py-3">
						<p className="font-mono-ui text-[10px] text-overdue">Erro</p>
						<p className="mt-1 font-client text-sm text-overdue">
							{errorMessage}
						</p>
						<button
							onClick={onRetry}
							className="mt-3 rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground">
							Tentar novamente
						</button>
					</div>
				)}

				<section className="px-4 pb-3">
					<div className="mb-3 flex items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
								Agenda da equipe
							</p>
							<p className="truncate font-client text-sm text-foreground-faint">
								{appointments.length} atendimentos no dia
							</p>
						</div>
						<button
							type="button"
							onClick={() => setTeamSheetOpen(true)}
							className="rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
							Gerenciar equipe
						</button>
					</div>

					<div className="flex gap-2 overflow-x-auto pb-1">
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
				</section>

				<section className="space-y-3 px-4 pb-6">
					{isLoading ?
						<div className="rounded-lg border border-border bg-card px-4 py-12 text-center font-mono-ui text-xs text-foreground-faint">
							Carregando equipe
						</div>
					: barbers.length === 0 ?
						<div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
							<p className="font-mono-ui text-xs text-foreground-faint">
								Nenhum barbeiro cadastrado
							</p>
							<button
								type="button"
								onClick={() => setTeamSheetOpen(true)}
								className="mt-4 rounded-md bg-foreground px-4 py-3 font-mono-ui text-xs text-primary-foreground">
								Gerenciar equipe
							</button>
						</div>
					:	visibleBarbers.map((barber) => {
							const rows = grouped.get(barber.id) || [];
							const total = getBarberTotal(rows);

							return (
								<div
									key={barber.id}
									className="rounded-lg border border-border bg-card p-4">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="truncate font-logo text-xl leading-tight text-foreground">
												{barber.name}
											</p>
											<p className="mt-1 font-mono-ui text-[10px] text-foreground-faint">
												{rows.length} atendimentos hoje
											</p>
										</div>
										<button
											type="button"
											onClick={() => openNewForBarber(barber.id)}
											className="rounded-md bg-paid px-3 py-2 font-mono-ui text-[10px] text-primary-foreground">
											+ atendimento
										</button>
									</div>

									<div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3 rounded-md bg-background-deep px-3 py-3">
										<div>
											<p className="font-mono-ui text-[10px] text-foreground-faint">
												Total do dia
											</p>
											<p className="mt-1 font-value text-3xl leading-none text-paid">
												{formatCurrency(total)}
											</p>
										</div>
										<span
											className={`rounded-full border px-2.5 py-1 font-mono-ui text-[10px] ${accessTone(barber)}`}>
											{accessLabel(barber)}
										</span>
									</div>

									<div className="mt-3 space-y-2">
										{rows.length === 0 ?
											<p className="rounded-md border border-dashed border-border bg-background-deep px-3 py-6 text-center font-mono-ui text-[10px] text-foreground-faint">
												Sem agenda neste dia
											</p>
										:	rows.map((appointment) => (
												<button
													type="button"
													key={appointment.id}
													onClick={() => openEdit(appointment)}
													className="w-full rounded-lg border border-border bg-background-deep p-3 text-left transition-colors hover:bg-secondary">
													<div className="flex items-center justify-between gap-2">
														<p className="font-mono-ui text-xs text-foreground">
															{appointment.time_slot}
														</p>
														<span
															className={`rounded-full border px-2 py-0.5 font-mono-ui text-[9px] ${statusTone(appointment.status)}`}>
															{statusLabel(appointment.status)}
														</span>
													</div>
													<p className="mt-2 truncate font-client text-sm text-foreground">
														{appointment.client_name}
													</p>
													<div className="mt-2 flex items-center justify-between gap-2">
														<p className="truncate font-mono-ui text-[10px] text-foreground-faint">
															{appointment.service_name || "Atendimento"}
														</p>
														<p className="font-value text-sm text-foreground">
															{appointment.value > 0 ?
																formatCurrency(appointment.value)
															:	"R$ ·"}
														</p>
													</div>
												</button>
											))
										}
									</div>
								</div>
							);
						})
					}
				</section>
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
							<button
								type="button"
								onClick={() => setTeamSheetOpen(false)}
								className="rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
								Fechar
							</button>
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
								<p
									className={`break-words rounded-md border px-3 py-2 font-client text-xs ${
										panelError ?
											"border-overdue/30 bg-overdue/10 text-overdue"
										:	"border-paid/30 bg-paid/10 text-paid"
									}`}>
									{panelError || panelMessage}
								</p>
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
					onClose={() => setDialogOpen(false)}
					onSave={onReload}
					onError={setPanelError}
				/>
			)}
		</>
	);
}
