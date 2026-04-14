import { formatCurrency } from '@/lib/store';
export function DaySummaryCard({ summary }) {
    return (<div className="px-4 py-4 border-b border-border bg-card">
      <p className="font-mono-ui text-xs text-foreground-faint mb-2">RESUMO DO DIA</p>
      <p className="font-value text-2xl text-paid">{formatCurrency(summary.totalReceived)}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <p className="text-foreground-faint">Clientes: {summary.totalClients}</p>
        <p className="text-foreground-faint">Pagos: {summary.paid}</p>
        <p className="text-foreground-faint">Pendentes: {summary.pending}</p>
        <p className="text-foreground-faint">A cobrar: {formatCurrency(summary.toCollect)}</p>
      </div>
    </div>);
}
