import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import {
	EmptyState,
	IconButton,
	LoadingCard,
	Notice,
	ScreenHeader,
} from "@/components/ScreenPrimitives";
import {
	addFixedClient,
	addFixedClientCut,
	addWaitlistEntry,
	deleteFixedClient,
	deleteFixedClientCut,
	deleteWaitlistEntry,
	formatCurrency,
	formatDayKey,
	getCachedFixedClients,
	getCachedWaitlist,
	loadFixedClients,
	loadWaitlist,
	saveFixedClient,
	saveFixedClientCut,
	saveWaitlistEntry,
} from "@/lib/store";
import {
	parseMoneyInput,
	validateMoney,
	validateRequiredText,
} from "@/lib/validation";

const emptyClientForm = {
	name: "",
	phone: "",
	interval_days: "15",
	package_total_cuts: "4",
	notes: "",
};

const emptyCutForm = {
	date: formatDayKey(new Date()),
	value: "",
	paid: false,
	notes: "",
};

const emptyWaitForm = {
	name: "",
	phone: "",
	preference: "",
	notes: "",
};

function formatShortDate(dayKey) {
	if (!dayKey) return "Sem data";
	const [year, month, day] = String(dayKey).split("-");
	return `${day}/${month}/${year}`;
}

function Field({ label, children }) {
	return (
		<label className="block">
			<span className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
				{label}
			</span>
			{children}
		</label>
	);
}

function TextInput(props) {
	return (
		<input
			{...props}
			className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none focus:border-foreground/40 disabled:opacity-60"
		/>
	);
}

function TextArea(props) {
	return (
		<textarea
			{...props}
			rows={3}
			className="w-full resize-none rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none focus:border-foreground/40 disabled:opacity-60"
		/>
	);
}

function Sheet({ title, eyebrow, onClose, children }) {
	return (
		<div
			className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm"
			onClick={onClose}>
			<div
				className="max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-lg border-x border-t border-border bg-background px-4 pb-6 pt-4"
				onClick={(event) => event.stopPropagation()}>
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							{eyebrow}
						</p>
						<h2 className="mt-1 font-logo text-lg text-foreground">
							{title}
						</h2>
					</div>
					<IconButton label="Fechar" onClick={onClose}>
						x
					</IconButton>
				</div>
				<div className="mt-4">{children}</div>
			</div>
		</div>
	);
}

function FixedClientCard({
	client,
	onAddCut,
	onEdit,
	onToggleCutPaid,
	onDeleteCut,
	onRemoveClient,
	onSchedule,
	isSubmitting,
}) {
	const totalCuts = Number(client.package_total_cuts || 0);
	const progress =
		totalCuts > 0 ?
			Math.min(100, (Number(client.cuts_count || 0) / totalCuts) * 100)
		:	0;
	const latestCuts = (client.cuts || []).slice(0, 4);

	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate font-client text-lg leading-tight text-foreground">
						{client.name}
					</p>
					<p className="mt-1 truncate font-mono-ui text-[10px] text-foreground-faint">
						{client.phone || "Sem telefone"} • a cada {client.interval_days} dias
					</p>
					{client.barber_name && (
						<p className="mt-1 truncate font-mono-ui text-[9px] uppercase text-paid">
							{client.barber_name}
						</p>
					)}
				</div>
				<button
					type="button"
					onClick={() => onAddCut(client)}
					disabled={isSubmitting}
					className="shrink-0 rounded-md bg-foreground px-3 py-2 font-mono-ui text-[10px] text-primary-foreground disabled:opacity-60">
					Corte
				</button>
			</div>

			<div className="mt-4 grid grid-cols-3 gap-2">
				<div className="rounded-md bg-background-deep p-2">
					<p className="font-mono-ui text-[9px] uppercase text-foreground-faint">
						Pacote
					</p>
					<p className="mt-1 font-value text-lg text-foreground">
						{client.cuts_count}/{totalCuts || "-"}
					</p>
				</div>
				<div className="rounded-md bg-background-deep p-2">
					<p className="font-mono-ui text-[9px] uppercase text-foreground-faint">
						A receber
					</p>
					<p className="mt-1 font-value text-lg text-fiado">
						{formatCurrency(client.payment_due_value)}
					</p>
				</div>
				<div className="rounded-md bg-background-deep p-2">
					<p className="font-mono-ui text-[9px] uppercase text-foreground-faint">
						Proximo
					</p>
					<p className="mt-1 font-value text-lg text-foreground">
						{client.next_appointment ?
							`${formatShortDate(client.next_appointment.date)} ${client.next_appointment.time}`
						: client.next_due_date ?
							formatShortDate(client.next_due_date)
						: 	"-"}
					</p>
				</div>
			</div>

			{totalCuts > 0 && (
				<div className="mt-3 h-2 rounded-full bg-background-deep">
					<div
						className="h-full rounded-full bg-paid"
						style={{ width: `${progress}%` }}
					/>
				</div>
			)}

			<div className="mt-4 space-y-2">
				{latestCuts.length === 0 ?
					<p className="rounded-md border border-dashed border-border px-3 py-3 font-client text-sm text-foreground-faint">
						Nenhum corte registrado ainda.
					</p>
				:	latestCuts.map((cut) => (
						<div
							key={cut.id}
							className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
							<div className="min-w-0">
								<p className="font-mono-ui text-[10px] text-foreground">
									{formatShortDate(cut.date)}
								</p>
								<p className="font-client text-sm text-foreground-faint">
									{formatCurrency(cut.value)} • {cut.paid ? "pago" : "pendente"}
								</p>
							</div>
							<div className="flex shrink-0 gap-1">
								<button
									type="button"
									onClick={() => onToggleCutPaid(client, cut)}
									disabled={isSubmitting}
									className={`rounded-md border px-2 py-2 font-mono-ui text-[9px] ${
										cut.paid ?
											"border-border text-foreground-faint"
										:	"border-paid/40 bg-paid/10 text-paid"
									}`}>
									{cut.paid ? "Abrir" : "Pago"}
								</button>
								<button
									type="button"
									onClick={() => onDeleteCut(client, cut)}
									disabled={isSubmitting}
									className="rounded-md border border-overdue/30 px-2 py-2 font-mono-ui text-[9px] text-overdue">
									Excluir
								</button>
							</div>
						</div>
					))
				}
			</div>

			<div className="mt-4 flex gap-2">
				<button
					type="button"
					onClick={() => onSchedule(client)}
					disabled={isSubmitting}
					className="flex-1 rounded-md bg-paid px-3 py-2 font-mono-ui text-[10px] text-primary-foreground disabled:opacity-60">
					{client.next_appointment ? "Agendar outro" : "Agendar próximo"}
				</button>
				<button
					type="button"
					onClick={() => onEdit(client)}
					disabled={isSubmitting}
					className="flex-1 rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
					Editar
				</button>
				<button
					type="button"
					onClick={() => onRemoveClient(client)}
					disabled={isSubmitting}
					className="rounded-md border border-overdue/30 px-3 py-2 font-mono-ui text-[10px] text-overdue">
					Remover
				</button>
			</div>
		</div>
	);
}

export default function ClientsPage() {
	const cachedFixed = getCachedFixedClients();
	const cachedWaitlist = getCachedWaitlist();
	const [activeTab, setActiveTab] = useState("fixed");
	const [clients, setClients] = useState(cachedFixed || []);
	const [waitlist, setWaitlist] = useState(cachedWaitlist || []);
	const [isLoading, setIsLoading] = useState(!cachedFixed || !cachedWaitlist);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [formError, setFormError] = useState("");
	const [clientForm, setClientForm] = useState(emptyClientForm);
	const [cutForm, setCutForm] = useState(emptyCutForm);
	const [waitForm, setWaitForm] = useState(emptyWaitForm);
	const [editingClientId, setEditingClientId] = useState(null);
	const [cutClient, setCutClient] = useState(null);
	const [scheduleClient, setScheduleClient] = useState(null);
	const [showClientSheet, setShowClientSheet] = useState(false);
	const [showWaitSheet, setShowWaitSheet] = useState(false);
	const hasLoadedRef = useRef(Boolean(cachedFixed && cachedWaitlist));

	const currentList = activeTab === "fixed" ? clients : waitlist;
	const actionLabel = activeTab === "fixed" ? "Novo fixo" : "Nova espera";

	const sortedClients = useMemo(() => {
		return [...clients].sort((first, second) => {
			const firstDue = first.next_due_date || "9999-12-31";
			const secondDue = second.next_due_date || "9999-12-31";
			return firstDue.localeCompare(secondDue);
		});
	}, [clients]);

	const reload = useCallback(async () => {
		const hasLoaded = hasLoadedRef.current;
		setIsLoading(!hasLoaded);
		setIsRefreshing(hasLoaded);
		setErrorMessage("");
		try {
			const [fixedList, waitingList] = await Promise.all([
				loadFixedClients({ force: true }),
				loadWaitlist({ force: true }),
			]);
			setClients(fixedList);
			setWaitlist(waitingList);
			hasLoadedRef.current = true;
		} catch (error) {
			setErrorMessage(error.message || "Falha ao carregar clientes.");
			if (!hasLoaded) {
				setClients([]);
				setWaitlist([]);
			}
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, []);

	useEffect(() => {
		reload();
	}, [reload]);

	const closeSheets = () => {
		setShowClientSheet(false);
		setShowWaitSheet(false);
		setCutClient(null);
		setScheduleClient(null);
		setEditingClientId(null);
		setClientForm(emptyClientForm);
		setCutForm(emptyCutForm);
		setWaitForm(emptyWaitForm);
		setFormError("");
	};

	const openAction = () => {
		setFormError("");
		if (activeTab === "fixed") {
			setClientForm(emptyClientForm);
			setEditingClientId(null);
			setShowClientSheet(true);
		} else {
			setWaitForm(emptyWaitForm);
			setShowWaitSheet(true);
		}
	};

	const openEditClient = (client) => {
		setClientForm({
			name: client.name || "",
			phone: client.phone || "",
			interval_days: String(client.interval_days || 15),
			package_total_cuts: String(client.package_total_cuts ?? 4),
			notes: client.notes || "",
		});
		setEditingClientId(client.id);
		setShowClientSheet(true);
		setFormError("");
	};

	const openCutSheet = (client) => {
		setCutClient(client);
		setCutForm(emptyCutForm);
		setFormError("");
	};

	const handleClientSubmit = async (event) => {
		event.preventDefault();
		if (isSubmitting) return;

		const validationMessage =
			validateRequiredText(clientForm.name, "Nome do cliente", {
				minLength: 2,
				maxLength: 120,
			}) ||
			validateRequiredText(clientForm.interval_days, "Intervalo", {
				minLength: 1,
				maxLength: 3,
			}) ||
			validateRequiredText(clientForm.package_total_cuts, "Total do pacote", {
				minLength: 1,
				maxLength: 3,
			});
		if (validationMessage) {
			setFormError(validationMessage);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		setFormError("");
		try {
			const payload = {
				name: clientForm.name.trim(),
				phone: clientForm.phone.trim(),
				notes: clientForm.notes.trim(),
				interval_days: Number(clientForm.interval_days || 15),
				package_total_cuts: Number(clientForm.package_total_cuts || 4),
			};
			if (editingClientId) {
				await saveFixedClient(editingClientId, payload);
			} else {
				await addFixedClient(payload);
			}
			closeSheets();
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao salvar cliente.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCutSubmit = async (event) => {
		event.preventDefault();
		if (isSubmitting || !cutClient) return;

		const validationMessage =
			validateRequiredText(cutForm.date, "Data", {
				minLength: 10,
				maxLength: 10,
			}) ||
			validateMoney(cutForm.value || "0", "Valor", {
				min: 0,
				max: 99999.99,
			});
		if (validationMessage) {
			setFormError(validationMessage);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		setFormError("");
		try {
			await addFixedClientCut(cutClient.id, {
				date: cutForm.date,
				value: parseMoneyInput(cutForm.value || "0"),
				paid: cutForm.paid,
				notes: cutForm.notes.trim(),
			});
			closeSheets();
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao registrar corte.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleWaitSubmit = async (event) => {
		event.preventDefault();
		if (isSubmitting) return;

		const validationMessage = validateRequiredText(waitForm.name, "Nome", {
			minLength: 2,
			maxLength: 120,
		});
		if (validationMessage) {
			setFormError(validationMessage);
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		setFormError("");
		try {
			await addWaitlistEntry({
				name: waitForm.name.trim(),
				phone: waitForm.phone.trim(),
				preference: waitForm.preference.trim(),
				notes: waitForm.notes.trim(),
			});
			closeSheets();
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao salvar lista de espera.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const toggleCutPaid = async (client, cut) => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await saveFixedClientCut(client.id, cut.id, { paid: !cut.paid });
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao atualizar corte.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const removeCut = async (client, cut) => {
		if (isSubmitting) return;
		if (!window.confirm("Excluir este corte do pacote?")) return;
		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await deleteFixedClientCut(client.id, cut.id);
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao excluir corte.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const removeClient = async (client) => {
		if (isSubmitting) return;
		if (!window.confirm(`Remover ${client.name} dos clientes fixos?`)) return;
		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await deleteFixedClient(client.id);
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao remover cliente.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const markWaitScheduled = async (entry) => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await saveWaitlistEntry(entry.id, { status: "agendado" });
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao atualizar lista de espera.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const removeWaitEntry = async (entry) => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await deleteWaitlistEntry(entry.id);
			await reload();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao remover da lista.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="app-shell flex flex-col overflow-hidden bg-background">
			<ScreenHeader
				eyebrow="Relacionamento"
				title="Clientes"
				action={
					<IconButton label={actionLabel} onClick={openAction} tone="primary">
						+
					</IconButton>
				}>
				<div className="mt-4 grid grid-cols-2 rounded-lg border border-border bg-background-deep p-1 md:max-w-[520px]">
					<button
						type="button"
						onClick={() => setActiveTab("fixed")}
						className={`rounded-md px-3 py-2 font-mono-ui text-[11px] ${
							activeTab === "fixed" ?
								"bg-card text-foreground shadow-sm"
							:	"text-foreground-faint"
						}`}>
						Fixos
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("waitlist")}
						className={`rounded-md px-3 py-2 font-mono-ui text-[11px] ${
							activeTab === "waitlist" ?
								"bg-card text-foreground shadow-sm"
							:	"text-foreground-faint"
						}`}>
						Espera
					</button>
				</div>
			</ScreenHeader>

			<div className="min-h-0 flex-1 overflow-y-auto safe-bottom px-4 py-4">
				{errorMessage && (
					<div className="mb-3">
						<Notice tone="error" title="Erro">
							{errorMessage}
						</Notice>
					</div>
				)}

				{isRefreshing && (
					<p className="mb-3 rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] uppercase text-foreground-faint">
						Atualizando clientes...
					</p>
				)}

				{isLoading ?
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						<LoadingCard label="Carregando clientes" />
						<LoadingCard label="Carregando clientes" />
					</div>
				: currentList.length === 0 ?
					<EmptyState
						title={
							activeTab === "fixed" ?
								"Nenhum cliente fixo cadastrado"
							:	"Ninguem aguardando agendamento"
						}
						hint={
							activeTab === "fixed" ?
								"Cadastre quem corta sempre e controle pacote, datas e pagamento."
							:	"Use esta lista para nao perder quem pediu horario quando a agenda estava cheia."
						}
						action={
							<button
								type="button"
								onClick={openAction}
								className="rounded-md bg-foreground px-4 py-3 font-mono-ui text-sm text-primary-foreground">
								{actionLabel}
							</button>
						}
					/>
				: activeTab === "fixed" ?
					<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{sortedClients.map((client) => (
							<FixedClientCard
								key={client.id}
								client={client}
								onAddCut={openCutSheet}
								onEdit={openEditClient}
								onToggleCutPaid={toggleCutPaid}
								onDeleteCut={removeCut}
								onRemoveClient={removeClient}
								onSchedule={setScheduleClient}
								isSubmitting={isSubmitting}
							/>
						))}
					</div>
				:	<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{waitlist.map((entry) => (
							<div
								key={entry.id}
								className="rounded-lg border border-border bg-card p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="truncate font-client text-lg text-foreground">
											{entry.name}
										</p>
										<p className="mt-1 truncate font-mono-ui text-[10px] text-foreground-faint">
											{entry.phone || "Sem telefone"}
										</p>
									</div>
								</div>
								{entry.preference && (
									<p className="mt-3 rounded-md bg-background-deep px-3 py-2 font-client text-sm text-foreground">
										{entry.preference}
									</p>
								)}
								{entry.notes && (
									<p className="mt-2 font-client text-sm text-foreground-faint">
										{entry.notes}
									</p>
								)}
								<div className="mt-4 flex gap-2">
									<button
										type="button"
										onClick={() => markWaitScheduled(entry)}
										disabled={isSubmitting}
										className="flex-1 rounded-md bg-paid px-3 py-2 font-mono-ui text-[10px] text-primary-foreground disabled:opacity-60">
										Agendado
									</button>
									<button
										type="button"
										onClick={() => removeWaitEntry(entry)}
										disabled={isSubmitting}
										className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint disabled:opacity-60">
										Remover
									</button>
								</div>
							</div>
						))}
					</div>
				}
			</div>

			{showClientSheet && (
				<Sheet
					eyebrow="Cliente fixo"
					title={editingClientId ? "Editar cliente" : "Novo cliente fixo"}
					onClose={closeSheets}>
					<form onSubmit={handleClientSubmit} className="space-y-3">
						{formError && (
							<Notice tone="error" title="Erro">
								{formError}
							</Notice>
						)}
						<Field label="Nome">
							<TextInput
								value={clientForm.name}
								onChange={(event) =>
									setClientForm((prev) => ({
										...prev,
										name: event.target.value,
									}))
								}
								disabled={isSubmitting}
								placeholder="Nome do cliente"
							/>
						</Field>
						<Field label="Telefone">
							<TextInput
								value={clientForm.phone}
								onChange={(event) =>
									setClientForm((prev) => ({
										...prev,
										phone: event.target.value,
									}))
								}
								disabled={isSubmitting}
								placeholder="(00) 00000-0000"
							/>
						</Field>
						<div className="grid grid-cols-2 gap-3">
							<Field label="Recorrencia em dias">
								<TextInput
									type="number"
									min="1"
									value={clientForm.interval_days}
									onChange={(event) =>
										setClientForm((prev) => ({
											...prev,
											interval_days: event.target.value,
										}))
									}
									disabled={isSubmitting}
								/>
							</Field>
							<Field label="Cortes do pacote">
								<TextInput
									type="number"
									min="0"
									value={clientForm.package_total_cuts}
									onChange={(event) =>
										setClientForm((prev) => ({
											...prev,
											package_total_cuts: event.target.value,
										}))
									}
									disabled={isSubmitting}
								/>
							</Field>
						</div>
						<Field label="Observacoes">
							<TextArea
								value={clientForm.notes}
								onChange={(event) =>
									setClientForm((prev) => ({
										...prev,
										notes: event.target.value,
									}))
								}
								disabled={isSubmitting}
								placeholder="Preferencias, forma de pagamento, combinados"
							/>
						</Field>
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full rounded-md bg-foreground py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
							{isSubmitting ? "Salvando..." : "Salvar cliente"}
						</button>
					</form>
				</Sheet>
			)}

			{cutClient && (
				<Sheet
					eyebrow="Pacote"
					title={`Corte de ${cutClient.name}`}
					onClose={closeSheets}>
					<form onSubmit={handleCutSubmit} className="space-y-3">
						{formError && (
							<Notice tone="error" title="Erro">
								{formError}
							</Notice>
						)}
						<div className="grid grid-cols-2 gap-3">
							<Field label="Data">
								<TextInput
									type="date"
									value={cutForm.date}
									onChange={(event) =>
										setCutForm((prev) => ({
											...prev,
											date: event.target.value,
										}))
									}
									disabled={isSubmitting}
								/>
							</Field>
							<Field label="Valor">
								<TextInput
									inputMode="decimal"
									value={cutForm.value}
									onChange={(event) =>
										setCutForm((prev) => ({
											...prev,
											value: event.target.value,
										}))
									}
									disabled={isSubmitting}
									placeholder="45,00"
								/>
							</Field>
						</div>
						<label className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-3">
							<span className="font-client text-sm text-foreground">
								Ja foi pago
							</span>
							<input
								type="checkbox"
								checked={cutForm.paid}
								onChange={(event) =>
									setCutForm((prev) => ({
										...prev,
										paid: event.target.checked,
									}))
								}
								disabled={isSubmitting}
								className="h-5 w-5 accent-current"
							/>
						</label>
						<Field label="Observacoes">
							<TextArea
								value={cutForm.notes}
								onChange={(event) =>
									setCutForm((prev) => ({
										...prev,
										notes: event.target.value,
									}))
								}
								disabled={isSubmitting}
								placeholder="Detalhe do atendimento"
							/>
						</Field>
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full rounded-md bg-foreground py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
							{isSubmitting ? "Salvando..." : "Registrar corte"}
						</button>
					</form>
				</Sheet>
			)}

			{showWaitSheet && (
				<Sheet eyebrow="Lista de espera" title="Novo aguardando" onClose={closeSheets}>
					<form onSubmit={handleWaitSubmit} className="space-y-3">
						{formError && (
							<Notice tone="error" title="Erro">
								{formError}
							</Notice>
						)}
						<Field label="Nome">
							<TextInput
								value={waitForm.name}
								onChange={(event) =>
									setWaitForm((prev) => ({ ...prev, name: event.target.value }))
								}
								disabled={isSubmitting}
								placeholder="Nome do cliente"
							/>
						</Field>
						<Field label="Telefone">
							<TextInput
								value={waitForm.phone}
								onChange={(event) =>
									setWaitForm((prev) => ({ ...prev, phone: event.target.value }))
								}
								disabled={isSubmitting}
								placeholder="(00) 00000-0000"
							/>
						</Field>
						<Field label="Preferencia">
							<TextInput
								value={waitForm.preference}
								onChange={(event) =>
									setWaitForm((prev) => ({
										...prev,
										preference: event.target.value,
									}))
								}
								disabled={isSubmitting}
								placeholder="Terça cedo, sábado se abrir vaga"
							/>
						</Field>
						<Field label="Observacoes">
							<TextArea
								value={waitForm.notes}
								onChange={(event) =>
									setWaitForm((prev) => ({ ...prev, notes: event.target.value }))
								}
								disabled={isSubmitting}
								placeholder="Mensagem, urgencia ou detalhe do corte"
							/>
						</Field>
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full rounded-md bg-foreground py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
							{isSubmitting ? "Salvando..." : "Adicionar na espera"}
						</button>
					</form>
				</Sheet>
			)}

			{scheduleClient && (
				<AppointmentDialog
					dayKey={scheduleClient.next_due_date || formatDayKey(new Date())}
					defaultClientId={scheduleClient.id}
					defaultClientName={scheduleClient.name}
					forcedBarberId={scheduleClient.barbeiro_id}
					canChooseDate
					onClose={() => setScheduleClient(null)}
					onSave={async () => {
						setScheduleClient(null);
						await reload();
					}}
					onError={setErrorMessage}
				/>
			)}

			<BottomNav />
		</div>
	);
}
