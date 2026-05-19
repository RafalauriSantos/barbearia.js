import { formatCurrency } from "@/lib/store";

// Card com os numeros principais do dia.
export function DaySummaryCard({ summary }) {
	// Mostra os numeros principais do dia.
	return (
		<div className="px-4 pt-4">
			<div className="rounded-lg border border-border bg-card p-4">
				<div className="flex items-end justify-between gap-3">
					<div className="min-w-0">
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							Hoje
						</p>
						<p className="mt-1 font-value text-3xl leading-none text-paid">
							{formatCurrency(summary.totalReceived)}
						</p>
						<p className="mt-1 font-mono-ui text-[10px] text-foreground-faint">
							{summary.totalClients} clientes
						</p>
					</div>
					<div className="text-right">
						<p className="font-mono-ui text-[10px] text-foreground-faint">
							Pagos
						</p>
						<p className="font-value text-xl text-paid">{summary.paid}</p>
					</div>
				</div>

				<div className="mt-4 grid grid-cols-2 gap-2 rounded-md bg-background-deep px-3 py-2">
					<div>
						<p className="font-mono-ui text-[10px] text-foreground-faint">
							Pendentes
						</p>
						<p className="font-value text-lg text-fiado">{summary.pending}</p>
					</div>
					<div className="text-right">
						<p className="font-mono-ui text-[10px] text-foreground-faint">
							A cobrar
						</p>
						<p className="font-value text-lg text-foreground">
							{formatCurrency(summary.toCollect)}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
