import { formatCurrency } from '@/lib/store';
export function DaySummaryCard({ summary }) {
    return (<div className="px-4 py-5 animate-fade-up">
      <div className="flex items-baseline gap-2">
        <span className="font-mono-ui text-xs text-foreground-faint">R$</span>
        <span className="font-value text-5xl text-paid leading-none">
          {summary.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex items-baseline gap-3 mt-1">
        <p className="font-mono-ui text-[10px] text-foreground-faint tracking-widest">
          recebido hoje
        </p>
        <span className="font-mono-ui text-[10px] text-foreground-faint">
          · {summary.totalClients} cliente{summary.totalClients !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <Chip color="paid">{summary.paid} pago{summary.paid !== 1 ? 's' : ''}</Chip>
        <Chip color="faint">{summary.pending} pendente{summary.pending !== 1 ? 's' : ''}</Chip>
        {summary.toCollect > 0 && (<Chip color="fiado">{formatCurrency(summary.toCollect)} a cobrar</Chip>)}
        {summary.overdue > 0 && (<Chip color="overdue">{summary.overdue} vencido{summary.overdue !== 1 ? 's' : ''}</Chip>)}
      </div>
    </div>);
}
function Chip({ children, color }) {
    const styles = {
        paid: 'bg-paid/15 text-paid border-paid/20',
        faint: 'bg-secondary text-foreground-faint border-border',
        fiado: 'bg-fiado/15 text-fiado border-fiado/20',
        overdue: 'bg-overdue/15 text-overdue border-overdue/20',
    };
    return (<span className={`font-mono-ui text-[10px] px-2.5 py-1 rounded border ${styles[color]}`}>
      {children}
    </span>);
}
