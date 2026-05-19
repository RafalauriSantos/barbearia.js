import { useState } from "react";
import { formatCurrency } from "@/lib/store";

function getAdminRows(summary) {
	return summary?.resumo_por_barbeiro || [];
}

export function FinancialSummaryCompact({
	summary,
	isLoading = false,
	showBreakdown = false,
}) {
	const [expanded, setExpanded] = useState(false);

	if (isLoading) {
		return (
			<div className="px-4 py-3">
				<div className="rounded-lg border border-border bg-card px-3 py-3">
					<p className="font-mono-ui text-[10px] text-foreground-faint">
						Carregando financeiro
					</p>
				</div>
			</div>
		);
	}

	if (!summary) return null;

	const isAdmin = summary.type === "admin";
	const total = isAdmin ? summary.total_pago_geral : summary.total_pago;
	const barbearia = summary.total_barbearia ?? summary.parte_barbearia;
	const barbeiros = summary.total_barbeiros ?? summary.parte_barbeiro;
	const count =
		summary.quantidade_atendimentos_pagos ?? summary.quantidade_atendimentos;
	const rows = getAdminRows(summary);

	return (
		<div className="px-4 py-3">
			<div className="rounded-lg border border-border bg-card p-3">
				<div className="grid grid-cols-[1fr_auto] gap-3">
					<div className="min-w-0 rounded-md bg-background-deep px-3 py-2">
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							Total pago
						</p>
						<p className="mt-1 font-value text-2xl leading-none text-paid">
							{formatCurrency(total)}
						</p>
					</div>
					<div className="rounded-md bg-background-deep px-3 py-2 text-right">
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							Atendimentos
						</p>
						<p className="mt-1 font-value text-2xl leading-none text-foreground">
							{count}
						</p>
					</div>
				</div>

				{showBreakdown && (
					<div className="mt-2 grid grid-cols-2 gap-2">
						<div className="rounded-md bg-background-deep px-3 py-2">
							<p className="font-mono-ui text-[10px] text-foreground-faint">
								Barbearia
							</p>
							<p className="font-value text-base text-foreground">
								{formatCurrency(barbearia)}
							</p>
						</div>
						<div className="rounded-md bg-background-deep px-3 py-2">
							<p className="font-mono-ui text-[10px] text-foreground-faint">
								{isAdmin ? "Equipe" : "Sua comissão"}
							</p>
							<p className="font-value text-base text-foreground">
								{formatCurrency(barbeiros)}
							</p>
						</div>
					</div>
				)}

				{isAdmin && showBreakdown && rows.length > 0 && (
					<div className="mt-3">
						<button
							type="button"
							onClick={() => setExpanded((prev) => !prev)}
							className="rounded-md border border-border px-3 py-2 font-mono-ui text-[10px] text-foreground-faint transition-colors hover:bg-secondary hover:text-foreground">
							{expanded ? "Fechar equipe" : "Ver por barbeiro"}
						</button>

						{expanded && (
							<div className="mt-3 space-y-2">
								{rows.map((row) => (
									<div
										key={row.barbeiro_id || row.nome}
										className="rounded-lg border border-border bg-background-deep p-3">
										<div className="flex items-center justify-between gap-2">
											<p className="truncate font-client text-sm text-foreground">
												{row.nome}
											</p>
											<p className="font-mono-ui text-[10px] text-foreground-faint">
												{row.comissao_percent}% · {row.quantidade_atendimentos}
											</p>
										</div>
										<div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-foreground-faint">
											<span>Total {formatCurrency(row.total_pago)}</span>
											<span>Barbeiro {formatCurrency(row.parte_barbeiro)}</span>
											<span>Loja {formatCurrency(row.parte_barbearia)}</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
