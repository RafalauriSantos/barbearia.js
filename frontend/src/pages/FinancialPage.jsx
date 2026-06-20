import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { FinancialSummaryCompact } from "@/components/FinancialSummaryCompact";
import { ReceivablesPanel } from "@/components/ReceivablesPanel";
import { Notice, ScreenHeader } from "@/components/ScreenPrimitives";
import {
	formatDayKey,
	formatCurrency,
	getCachedFinancialSummary,
	loadFinancialSummary,
} from "@/lib/store";

function addDays(date, amount) {
	const next = new Date(date);
	next.setDate(next.getDate() + amount);
	return next;
}

function getMonthStart(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function PaymentMethodBreakdown({ rows = [] }) {
	if (!rows.length) {
		return (
			<div className="rounded-lg border border-border bg-background-deep p-4">
				<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
					Por recebimento
				</p>
				<p className="mt-2 font-client text-sm text-foreground-faint">
					Nenhum pagamento encontrado no período.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-border bg-background-deep p-4">
			<div className="flex items-center justify-between gap-3">
				<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
					Por recebimento
				</p>
				<p className="font-mono-ui text-[10px] text-foreground-faint">
					{rows.length} formas
				</p>
			</div>
			<div className="mt-3 space-y-2">
				{rows.map((row) => (
					<div
						key={row.forma_pagamento_id || row.codigo}
						className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-border bg-card px-3 py-2">
						<div className="min-w-0">
							<p className="truncate font-client text-sm text-foreground">
								{row.nome}
							</p>
							<p className="mt-0.5 font-mono-ui text-[10px] text-foreground-faint">
								{row.quantidade_atendimentos} atendimentos · taxas{" "}
								{formatCurrency(row.total_taxas)}
							</p>
						</div>
						<div className="text-right">
							<p className="font-value text-base text-paid">
								{formatCurrency(row.total_pago)}
							</p>
							<p className="font-mono-ui text-[10px] text-foreground-faint">
								liq. {formatCurrency(row.total_liquido)}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function ProductSalesBreakdown({ summary }) {
	const productSummary = summary || {};
	const productRows = productSummary.resumo_por_produto || [];
	const supplierRows = productSummary.resumo_por_fornecedor || [];

	if (!productSummary.quantidade) {
		return (
			<div className="rounded-lg border border-border bg-background-deep p-4">
				<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
					Produtos
				</p>
				<p className="mt-2 font-client text-sm text-foreground-faint">
					Nenhum produto vendido no período.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-border bg-background-deep p-4">
			<div className="flex items-center justify-between gap-3">
				<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
					Produtos
				</p>
				<p className="font-mono-ui text-[10px] text-foreground-faint">
					{productSummary.quantidade} itens
				</p>
			</div>

			<div className="mt-3 grid grid-cols-2 gap-2">
				<div className="rounded-md bg-card px-3 py-2">
					<p className="font-mono-ui text-[10px] text-foreground-faint">
						Vendido
					</p>
					<p className="font-value text-base text-paid">
						{formatCurrency(productSummary.total_vendido)}
					</p>
				</div>
				<div className="rounded-md bg-card px-3 py-2">
					<p className="font-mono-ui text-[10px] text-foreground-faint">
						Custo
					</p>
					<p className="font-value text-base text-foreground">
						{formatCurrency(productSummary.total_custo)}
					</p>
				</div>
				<div className="rounded-md bg-card px-3 py-2">
					<p className="font-mono-ui text-[10px] text-foreground-faint">
						Lucro
					</p>
					<p className="font-value text-base text-paid">
						{formatCurrency(productSummary.total_lucro)}
					</p>
				</div>
				<div className="rounded-md bg-card px-3 py-2">
					<p className="font-mono-ui text-[10px] text-foreground-faint">
						Fornecedor
					</p>
					<p className="font-value text-base text-fiado">
						{formatCurrency(productSummary.total_fornecedor_pagar)}
					</p>
				</div>
			</div>

			<div className="mt-2 grid grid-cols-2 gap-2">
				<div className="rounded-md bg-card px-3 py-2">
					<p className="font-mono-ui text-[10px] text-foreground-faint">
						Comissão produto
					</p>
					<p className="font-value text-base text-foreground">
						{formatCurrency(productSummary.total_comissao_barbeiros)}
					</p>
				</div>
				<div className="rounded-md bg-card px-3 py-2">
					<p className="font-mono-ui text-[10px] text-foreground-faint">
						Lucro loja
					</p>
					<p className="font-value text-base text-foreground">
						{formatCurrency(productSummary.total_lucro_barbearia)}
					</p>
				</div>
			</div>

			{supplierRows.length > 0 && (
				<div className="mt-3 space-y-2">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Fornecedores a pagar
					</p>
					{supplierRows.map((row) => (
						<div
							key={row.fornecedor}
							className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
							<div className="min-w-0">
								<p className="truncate font-client text-sm text-foreground">
									{row.fornecedor}
								</p>
								<p className="font-mono-ui text-[10px] text-foreground-faint">
									{row.quantidade} itens · lucro {formatCurrency(row.total_lucro)}
								</p>
							</div>
							<p className="font-value text-base text-fiado">
								{formatCurrency(row.fornecedor_pagar)}
							</p>
						</div>
					))}
				</div>
			)}

			{productRows.length > 0 && (
				<div className="mt-3 space-y-2">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Produtos vendidos
					</p>
					{productRows.slice(0, 5).map((row) => (
						<div
							key={row.produto_id || row.nome}
							className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-border bg-card px-3 py-2">
							<div className="min-w-0">
								<p className="truncate font-client text-sm text-foreground">
									{row.nome}
								</p>
								<p className="font-mono-ui text-[10px] text-foreground-faint">
									{row.quantidade} un. ·{" "}
									{row.tipo_compra === "consignado" ?
										"consignado"
									:	"à vista"}
								</p>
							</div>
							<div className="text-right">
								<p className="font-value text-base text-paid">
									{formatCurrency(row.total_lucro)}
								</p>
								<p className="font-mono-ui text-[10px] text-foreground-faint">
									venda {formatCurrency(row.total_vendido)}
								</p>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default function FinancialPage() {
	const initialDate = new Date();
	const initialDayKey = formatDayKey(initialDate);
	const initialSummaryParams = {
		start_date: initialDayKey,
		end_date: initialDayKey,
	};
	const initialSummary = getCachedFinancialSummary(initialSummaryParams);
	const [startDate, setStartDate] = useState(initialDayKey);
	const [endDate, setEndDate] = useState(initialDayKey);
	const [summary, setSummary] = useState(initialSummary || null);
	const [isLoading, setIsLoading] = useState(!initialSummary);
	const hasLoadedRef = useRef(Boolean(initialSummary));
	const [errorMessage, setErrorMessage] = useState("");
	const [activeView, setActiveView] = useState("summary");

	const summaryParams = useMemo(() => {
		if (startDate <= endDate) {
			return { start_date: startDate, end_date: endDate };
		}
		return { start_date: endDate, end_date: startDate };
	}, [endDate, startDate]);

	const reload = useCallback(async () => {
		const hasLoaded = hasLoadedRef.current;
		setIsLoading(!hasLoaded);
		setErrorMessage("");
		try {
			const nextSummary = await loadFinancialSummary(summaryParams, {
				force: true,
			});
			setSummary(nextSummary);
		} catch (error) {
			if (!hasLoaded) {
				setSummary(null);
			}
			setErrorMessage(error.message || "Falha ao carregar resumo financeiro.");
		} finally {
			setIsLoading(false);
			hasLoadedRef.current = true;
		}
	}, [summaryParams]);

	useEffect(() => {
		reload();
	}, [reload]);

	const setSingleDay = (date) => {
		const key = formatDayKey(date);
		setStartDate(key);
		setEndDate(key);
	};

	const setLastSevenDays = () => {
		const today = new Date();
		setStartDate(formatDayKey(addDays(today, -6)));
		setEndDate(formatDayKey(today));
	};

	const setCurrentMonth = () => {
		const today = new Date();
		setStartDate(getMonthStart(today));
		setEndDate(formatDayKey(today));
	};

	return (
		<div className="app-shell flex flex-col overflow-hidden bg-background">
			<ScreenHeader eyebrow="Caixa" title="Financeiro">
				<div className="mt-4 grid grid-cols-3 rounded-lg border border-border bg-background-deep p-1">
					{[
						["summary", "Resumo"],
						["open", "A cobrar"],
						["paid", "Histórico"],
					].map(([value, label]) => (
						<button
							key={value}
							type="button"
							onClick={() => setActiveView(value)}
							className={`rounded-md px-2 py-2 font-mono-ui text-[10px] ${
								activeView === value ?
									"bg-card text-foreground shadow-sm"
								: 	"text-foreground-faint"
							}`}>
							{label}
						</button>
					))}
				</div>
				<div className="mt-4 space-y-3 rounded-lg border border-border bg-background-deep p-3">
					<div className="grid grid-cols-2 gap-2">
						<label className="block">
							<span className="mb-1 block font-mono-ui text-[10px] uppercase text-foreground-faint">
								De
							</span>
							<input
								type="date"
								value={startDate}
								onChange={(event) => setStartDate(event.target.value)}
								className="h-10 w-full rounded-md border border-border bg-secondary px-2 font-mono-ui text-xs text-foreground"
							/>
						</label>
						<label className="block">
							<span className="mb-1 block font-mono-ui text-[10px] uppercase text-foreground-faint">
								Ate
							</span>
							<input
								type="date"
								value={endDate}
								onChange={(event) => setEndDate(event.target.value)}
								className="h-10 w-full rounded-md border border-border bg-secondary px-2 font-mono-ui text-xs text-foreground"
							/>
						</label>
					</div>
					<div className="grid grid-cols-3 gap-2">
						<button
							type="button"
							onClick={() => setSingleDay(new Date())}
							className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
							Hoje
						</button>
						<button
							type="button"
							onClick={setLastSevenDays}
							className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
							7 dias
						</button>
						<button
							type="button"
							onClick={setCurrentMonth}
							className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
							Mês
						</button>
					</div>
				</div>
			</ScreenHeader>

			<div className="min-h-0 flex-1 overflow-y-auto safe-bottom">
				{activeView === "summary" && errorMessage && (
					<div className="mx-4 mt-4">
						<Notice tone="error" title="Erro">
							{errorMessage}
						</Notice>
					</div>
				)}

				{activeView === "summary" && (
					<FinancialSummaryCompact
						summary={summary}
						isLoading={isLoading}
						showBreakdown
					/>
				)}

				{activeView === "summary" && !isLoading && summary && (
					<div className="space-y-3 px-4 pb-6">
						<PaymentMethodBreakdown
							rows={summary.resumo_por_forma_pagamento || []}
						/>
						<ProductSalesBreakdown summary={summary.resumo_produtos} />
					</div>
				)}

				{activeView === "open" && (
					<ReceivablesPanel
						status="aberto"
						startDate={summaryParams.start_date}
						endDate={summaryParams.end_date}
						onChanged={reload}
					/>
				)}

				{activeView === "paid" && (
					<ReceivablesPanel
						status="pago"
						startDate={summaryParams.start_date}
						endDate={summaryParams.end_date}
						onChanged={reload}
					/>
				)}
			</div>

			<BottomNav />
		</div>
	);
}
