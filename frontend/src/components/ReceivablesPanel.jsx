import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { IconButton, Notice } from "@/components/ScreenPrimitives";
import {
	addReceivable,
	cancelReceivable,
	formatCurrency,
	getCachedBarbers,
	getCachedPaymentMethods,
	loadBarbers,
	loadPaymentMethods,
	loadReceivables,
	receiveReceivable,
	saveReceivable,
} from "@/lib/store";

function formatShortDate(dayKey) {
	if (!dayKey) return "Sem data";
	const [year, month, day] = String(dayKey).split("-");
	return `${day}/${month}/${year}`;
}

function todayKey() {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "America/Sao_Paulo",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
}

const emptyForm = {
	client_name: "",
	description: "",
	value: "",
	debt_date: todayKey(),
	debt_time: "",
	due_date: "",
	notes: "",
	barbeiro_id: "",
};

function Sheet({ eyebrow, title, onClose, children }) {
	return (
		<div
			className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-sm"
			onClick={onClose}>
			<div
				className="max-h-[92dvh] w-full max-w-[520px] overflow-y-auto rounded-t-lg border-x border-t border-border bg-background px-4 pb-6 pt-4"
				onClick={(event) => event.stopPropagation()}>
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							{eyebrow}
						</p>
						<h2 className="mt-1 font-logo text-lg text-foreground">{title}</h2>
					</div>
					<IconButton label="Fechar" onClick={onClose}>×</IconButton>
				</div>
				<div className="mt-4">{children}</div>
			</div>
		</div>
	);
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

const inputClass =
	"w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none disabled:opacity-60";

export function ReceivablesPanel({ status, startDate, endDate, onChanged }) {
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";
	const [search, setSearch] = useState("");
	const [rows, setRows] = useState([]);
	const [barbers, setBarbers] = useState(getCachedBarbers() || []);
	const [paymentMethods, setPaymentMethods] = useState(
		getCachedPaymentMethods() || [],
	);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [editing, setEditing] = useState(null);
	const [receiving, setReceiving] = useState(null);
	const [form, setForm] = useState(emptyForm);
	const [paymentMethodId, setPaymentMethodId] = useState("");
	const [paymentDate, setPaymentDate] = useState(todayKey());

	const query = useMemo(
		() => ({
			status,
			start_date: startDate,
			end_date: endDate,
			...(search.trim() ? { search: search.trim() } : {}),
		}),
		[endDate, search, startDate, status],
	);

	const reload = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage("");
		try {
			const [receivableRows, methods, barberRows] = await Promise.all([
				loadReceivables(query, { force: true }),
				loadPaymentMethods(),
				isAdmin ? loadBarbers() : Promise.resolve([]),
			]);
			setRows(receivableRows);
			setPaymentMethods(methods);
			if (isAdmin) setBarbers(barberRows);
		} catch (error) {
			setErrorMessage(error.message || "Falha ao carregar cobrancas.");
		} finally {
			setIsLoading(false);
		}
	}, [isAdmin, query]);

	useEffect(() => {
		const timeout = setTimeout(reload, 200);
		return () => clearTimeout(timeout);
	}, [reload]);

	const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);

	const openNew = () => {
		setEditing({ id: null, origin: "manual" });
		setForm({
			...emptyForm,
			debt_date: todayKey(),
			barbeiro_id: user?.barbeiro_id || "",
		});
	};

	const openEdit = (row) => {
		setEditing(row);
		setForm({
			client_name: row.client_name,
			description: row.description,
			value: String(row.value || ""),
			debt_date: row.debt_date,
			debt_time: row.debt_time || "",
			due_date: row.due_date || "",
			notes: row.notes || "",
			barbeiro_id: row.barbeiro_id || "",
		});
	};

	const handleSave = async (event) => {
		event.preventDefault();
		if (isSaving) return;
		setIsSaving(true);
		setErrorMessage("");
		try {
			const payload = {
				...form,
				client_name: form.client_name.trim(),
				description: form.description.trim(),
				notes: form.notes.trim(),
				value: Number(String(form.value).replace(",", ".")),
				due_date: form.due_date || null,
				debt_time: form.debt_time || null,
				...(isAdmin && form.barbeiro_id ? { barbeiro_id: form.barbeiro_id } : {}),
			};
			if (editing?.id) await saveReceivable(editing.id, payload);
			else await addReceivable(payload);
			setEditing(null);
			await reload();
			onChanged?.();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao salvar cobranca.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleReceive = async (event) => {
		event.preventDefault();
		if (!receiving || !paymentMethodId || isSaving) return;
		setIsSaving(true);
		setErrorMessage("");
		try {
			await receiveReceivable(receiving.id, {
				payment_method_id: paymentMethodId,
				payment_date: paymentDate,
			});
			setReceiving(null);
			setPaymentMethodId("");
			await reload();
			onChanged?.();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao receber cobranca.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancel = async (row) => {
		if (!window.confirm(`Cancelar a cobranca de ${row.client_name}?`)) return;
		setIsSaving(true);
		try {
			await cancelReceivable(row.id);
			await reload();
			onChanged?.();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao cancelar cobranca.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-3 px-4 pb-6 pt-4">
			{errorMessage && <Notice tone="error" title="Erro">{errorMessage}</Notice>}

			<div className="flex items-end gap-2">
				<div className="min-w-0 flex-1"><Field label="Pesquisar cliente">
					<input
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Nome ou descricao"
						className={inputClass}
					/>
				</Field></div>
				{status === "aberto" && (
					<button
						type="button"
						onClick={openNew}
						className="h-[46px] shrink-0 rounded-md bg-foreground px-3 font-mono-ui text-[10px] text-primary-foreground">
						Nova dívida
					</button>
				)}
			</div>

			<div className="flex items-center justify-between border-y border-border py-3">
				<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
					{status === "aberto" ? "Total a cobrar" : "Total recebido"}
				</p>
				<p className={`font-value text-xl ${status === "aberto" ? "text-fiado" : "text-paid"}`}>
					{formatCurrency(total)}
				</p>
			</div>

			{isLoading ?
				<p className="rounded-md border border-border bg-card px-3 py-4 font-mono-ui text-[10px] text-foreground-faint">
					Carregando cobrancas...
				</p>
			: rows.length === 0 ?
				<p className="rounded-md border border-dashed border-border px-3 py-6 text-center font-client text-sm text-foreground-faint">
					{status === "aberto" ? "Nenhuma divida no periodo." : "Nenhum recebimento no periodo."}
				</p>
			: rows.map((row) => (
					<div key={row.id} className="rounded-lg border border-border bg-card p-4">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="truncate font-client text-base font-semibold text-foreground">
									{row.client_name}
								</p>
								<p className="mt-1 font-client text-sm text-foreground-faint">
									{row.description}
								</p>
							</div>
							<p className={`font-value text-lg ${row.status === "pago" ? "text-paid" : "text-fiado"}`}>
								{formatCurrency(row.value)}
							</p>
						</div>
						<div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-foreground-faint">
							<p className="font-mono-ui">Dívida {formatShortDate(row.debt_date)}{row.debt_time ? ` às ${row.debt_time}` : ""}</p>
							<p className="text-right font-mono-ui">
								{row.status === "pago" ?
									`Pago ${formatShortDate(row.payment_date)}`
								: row.due_date ?
									`Vence ${formatShortDate(row.due_date)}`
								: 	"Sem vencimento"}
							</p>
						</div>
						{row.notes && <p className="mt-3 rounded-md bg-background-deep px-3 py-2 font-client text-sm text-foreground-faint">{row.notes}</p>}
						<p className="mt-2 font-mono-ui text-[9px] uppercase text-foreground-faint">
							{row.origin === "appointment" ? "Agenda" : "Manual"}
							{row.barber_name ? ` · ${row.barber_name}` : ""}
							{row.payment_method_name ? ` · ${row.payment_method_name}` : ""}
						</p>
						{row.status === "aberto" && (
							<div className="mt-4 flex gap-2">
								{row.origin === "manual" && <button type="button" onClick={() => openEdit(row)} className="flex-1 rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">Editar</button>}
								{row.origin === "manual" && <button type="button" onClick={() => handleCancel(row)} className="rounded-md border border-overdue/30 px-3 py-2 font-mono-ui text-[10px] text-overdue">Cancelar</button>}
								<button type="button" onClick={() => { setReceiving(row); setPaymentDate(todayKey()); }} className="flex-1 rounded-md bg-paid px-3 py-2 font-mono-ui text-[10px] text-primary-foreground">Receber</button>
							</div>
						)}
					</div>
				))
			}

			{editing && (
				<Sheet eyebrow="Contas a receber" title={editing.id ? "Editar dívida" : "Nova dívida"} onClose={() => setEditing(null)}>
					<form onSubmit={handleSave} className="space-y-3">
						<Field label="Cliente"><input required value={form.client_name} onChange={(e) => setForm((current) => ({ ...current, client_name: e.target.value }))} className={inputClass} /></Field>
						<Field label="Descrição"><input required value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className={inputClass} placeholder="Produto, serviço ou combinado" /></Field>
						<div className="grid grid-cols-2 gap-3">
							<Field label="Valor"><input required inputMode="decimal" value={form.value} onChange={(e) => setForm((current) => ({ ...current, value: e.target.value }))} className={inputClass} /></Field>
							<Field label="Data da dívida"><input required type="date" value={form.debt_date} onChange={(e) => setForm((current) => ({ ...current, debt_date: e.target.value }))} className={inputClass} /></Field>
						</div>
						<Field label="Horário"><input type="time" value={form.debt_time} onChange={(e) => setForm((current) => ({ ...current, debt_time: e.target.value }))} className={inputClass} /></Field>
						<Field label="Vencimento"><input type="date" value={form.due_date} onChange={(e) => setForm((current) => ({ ...current, due_date: e.target.value }))} className={inputClass} /></Field>
						{isAdmin && <Field label="Barbeiro"><select required value={form.barbeiro_id} onChange={(e) => setForm((current) => ({ ...current, barbeiro_id: e.target.value }))} className={inputClass}><option value="">Selecione</option>{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}</select></Field>}
						<Field label="Observações"><textarea rows={3} value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} className={inputClass} /></Field>
						<button type="submit" disabled={isSaving} className="w-full rounded-md bg-foreground py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">{isSaving ? "Salvando..." : "Salvar dívida"}</button>
					</form>
				</Sheet>
			)}

			{receiving && (
				<Sheet eyebrow="Recebimento" title={`Receber de ${receiving.client_name}`} onClose={() => setReceiving(null)}>
					<form onSubmit={handleReceive} className="space-y-3">
						<div className="rounded-md bg-background-deep px-3 py-3"><p className="font-value text-xl text-paid">{formatCurrency(receiving.value)}</p></div>
						<Field label="Forma de pagamento"><select required value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className={inputClass}><option value="">Selecione</option>{paymentMethods.filter((method) => method.active !== false && method.code !== "fiado").map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></Field>
						<Field label="Data do recebimento"><input required type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClass} /></Field>
						<button type="submit" disabled={isSaving || !paymentMethodId} className="w-full rounded-md bg-paid py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">{isSaving ? "Recebendo..." : "Confirmar recebimento"}</button>
					</form>
				</Sheet>
			)}
		</div>
	);
}
