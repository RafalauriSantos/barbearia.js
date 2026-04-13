import { useState } from 'react';
import { getDaySummary, formatCurrency, formatDayKey, formatDateDisplay, isToday } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
export default function FinancialPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const dayKey = formatDayKey(currentDate);
    const summary = getDaySummary(dayKey);
    const dateLabel = isToday(currentDate)
        ? `Hoje, ${formatDateDisplay(currentDate)}`
        : formatDateDisplay(currentDate);
    const prevDay = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 1);
        setCurrentDate(d);
    };
    const nextDay = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 1);
        setCurrentDate(d);
    };
    const netTotal = summary.totalReceived - summary.totalExpenses;
    return (<div className="app-shell flex flex-col min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="font-logo text-foreground text-base tracking-wider">FINANCEIRO</h1>
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="w-7 h-7 flex items-center justify-center text-foreground-faint hover:text-foreground transition-colors active:scale-95">‹</button>
          <span className="font-mono-ui text-xs text-foreground-faint">{dateLabel}</span>
          <button onClick={nextDay} className="w-7 h-7 flex items-center justify-center text-foreground-faint hover:text-foreground transition-colors active:scale-95">›</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-20 px-4 py-6 space-y-6 animate-fade-up">
        {/* Net total */}
        <div className="text-center">
          <span className="font-mono-ui text-[10px] text-foreground-faint tracking-widest block mb-1">SALDO DO DIA</span>
          <span className={`font-value text-4xl leading-none ${netTotal >= 0 ? 'text-paid' : 'text-overdue'}`}>
            {formatCurrency(netTotal)}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="CLIENTES" value={summary.totalClients.toString()}/>
          <StatCard label="RECEBIDO" value={formatCurrency(summary.totalReceived)} color="paid"/>
          <StatCard label="ENTRADAS" value={formatCurrency(summary.totalIncome)}/>
          <StatCard label="DESPESAS" value={formatCurrency(summary.totalExpenses)} color="overdue"/>
        </div>

        {/* Status breakdown */}
        <div className="space-y-2">
          <span className="font-mono-ui text-[10px] text-foreground-faint tracking-widest">DETALHAMENTO</span>
          <div className="space-y-1.5">
            <DetailRow label="Pagos" value={summary.paid.toString()} dot="paid"/>
            <DetailRow label="Pendentes" value={summary.pending.toString()} dot="faint"/>
            {summary.toCollect > 0 && (<DetailRow label="A cobrar" value={formatCurrency(summary.toCollect)} dot="fiado"/>)}
            {summary.overdue > 0 && (<DetailRow label="Vencidos" value={summary.overdue.toString()} dot="overdue"/>)}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>);
}
function StatCard({ label, value, color }) {
    const textColor = color === 'paid' ? 'text-paid' : color === 'overdue' ? 'text-overdue' : 'text-foreground';
    return (<div className="bg-secondary rounded-lg px-4 py-3">
      <span className="font-mono-ui text-[9px] text-foreground-faint tracking-widest block mb-1">{label}</span>
      <span className={`font-value text-lg ${textColor}`}>{value}</span>
    </div>);
}
function DetailRow({ label, value, dot }) {
    const dotColor = dot === 'paid' ? 'dot-paid' : dot === 'fiado' ? 'dot-fiado' : dot === 'overdue' ? 'dot-overdue' : 'dot-normal';
    return (<div className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${dotColor}`}/>
        <span className="font-mono-ui text-[10px] text-foreground-faint">{label}</span>
      </div>
      <span className="font-mono-ui text-xs text-foreground">{value}</span>
    </div>);
}
