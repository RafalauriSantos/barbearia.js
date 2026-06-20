import { useCallback, useEffect, useMemo, useState } from "react";
import { Notice } from "@/components/ScreenPrimitives";
import {
	formatCurrency,
	formatDayKey,
	loadSupplierPayables,
	paySupplierPayable,
} from "@/lib/store";

function formatDate(value) {
	return value ? value.split("-").reverse().join("/") : "Sem data";
}

export function SupplierPayablesPanel({ startDate, endDate, onChanged }) {
	const [status, setStatus] = useState("aberto");
	const [rows, setRows] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [selected, setSelected] = useState(null);
	const [paymentDate, setPaymentDate] = useState(formatDayKey(new Date()));
	const query = useMemo(
		() => ({ status, start_date: startDate, end_date: endDate }),
		[endDate, startDate, status],
	);

	const reload = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage("");
		try {
			setRows(await loadSupplierPayables(query, { force: true }));
		} catch (error) {
			setErrorMessage(error.message || "Falha ao carregar fornecedores.");
		} finally {
			setIsLoading(false);
		}
	}, [query]);

	useEffect(() => {
		reload();
	}, [reload]);

	const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);

	const handlePay = async (event) => {
		event.preventDefault();
		if (!selected || isSaving) return;
		setIsSaving(true);
		setErrorMessage("");
		try {
			await paySupplierPayable(selected.id, { payment_date: paymentDate });
			setSelected(null);
			await reload();
			onChanged?.();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao baixar fornecedor.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-3 px-4 pb-6 pt-4">
			{errorMessage && <Notice tone="error" title="Erro">{errorMessage}</Notice>}
			<div className="grid grid-cols-2 rounded-lg border border-border bg-background-deep p-1">
				{[["aberto", "A pagar"], ["pago", "Pagos"]].map(([value, label]) => (
					<button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-md px-3 py-2 font-mono-ui text-[10px] ${status === value ? "bg-card text-foreground" : "text-foreground-faint"}`}>
						{label}
					</button>
				))}
			</div>
			<div className="flex items-center justify-between border-y border-border py-3">
				<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">{status === "aberto" ? "Total a pagar" : "Total pago"}</p>
				<p className={`font-value text-xl ${status === "aberto" ? "text-fiado" : "text-paid"}`}>{formatCurrency(total)}</p>
			</div>
			{isLoading ?
				<p className="rounded-md border border-border bg-card px-3 py-4 font-mono-ui text-[10px] text-foreground-faint">Carregando fornecedores...</p>
			: rows.length === 0 ?
				<p className="rounded-md border border-dashed border-border px-3 py-6 text-center font-client text-sm text-foreground-faint">Nenhuma conta de fornecedor no período.</p>
			: rows.map((row) => (
				<div key={row.id} className="rounded-lg border border-border bg-card p-4">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="truncate font-client text-base font-semibold text-foreground">{row.supplier_name}</p>
							<p className="mt-1 font-client text-sm text-foreground-faint">{row.description}</p>
						</div>
						<p className="shrink-0 font-value text-lg text-fiado">{formatCurrency(row.value)}</p>
					</div>
					<p className="mt-3 font-mono-ui text-[10px] text-foreground-faint">
						Origem {formatDate(row.origin_date)}{row.payment_date ? ` · Pago ${formatDate(row.payment_date)}` : ""}{row.barber_name ? ` · ${row.barber_name}` : ""}
					</p>
					{row.status === "aberto" && (
						<button type="button" onClick={() => { setSelected(row); setPaymentDate(formatDayKey(new Date())); }} className="mt-4 w-full rounded-md bg-paid px-3 py-2 font-mono-ui text-[10px] text-primary-foreground">
							Dar baixa
						</button>
					)}
				</div>
			))}
			{selected && (
				<div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70" onClick={() => setSelected(null)}>
					<form onSubmit={handlePay} className="w-full max-w-[520px] rounded-t-lg border-x border-t border-border bg-background p-4 pb-6" onClick={(event) => event.stopPropagation()}>
						<p className="font-mono-ui text-[10px] uppercase text-paid">Baixa de fornecedor</p>
						<h2 className="mt-1 font-logo text-lg text-foreground">{selected.supplier_name}</h2>
						<p className="mt-2 font-value text-xl text-fiado">{formatCurrency(selected.value)}</p>
						<label className="mt-4 block">
							<span className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">Data do pagamento</span>
							<input required type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground" />
						</label>
						<button type="submit" disabled={isSaving} className="mt-4 w-full rounded-md bg-paid py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">{isSaving ? "Salvando..." : "Confirmar baixa"}</button>
					</form>
				</div>
			)}
		</div>
	);
}
