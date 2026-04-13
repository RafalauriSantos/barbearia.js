import { useState } from 'react';
import { loadExpenses, addExpense, deleteExpense, formatCurrency, formatDayKey } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
export default function ExpensesPage() {
    const [expenses, setExpenses] = useState(loadExpenses());
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [date, setDate] = useState(formatDayKey(new Date()));
    const reload = () => setExpenses(loadExpenses());
    const handleAdd = (e) => {
        e.preventDefault();
        if (!name.trim())
            return;
        addExpense({ name: name.trim(), value: parseFloat(value) || 0, date });
        setName('');
        setValue('');
        setDate(formatDayKey(new Date()));
        setShowForm(false);
        reload();
    };
    const handleDelete = (id) => {
        deleteExpense(id);
        reload();
    };
    // Group expenses by date
    const grouped = expenses
        .sort((a, b) => b.date.localeCompare(a.date))
        .reduce((acc, exp) => {
        (acc[exp.date] = acc[exp.date] || []).push(exp);
        return acc;
    }, {});
    const totalAll = expenses.reduce((sum, e) => sum + e.value, 0);
    return (<div className="app-shell flex flex-col min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-logo text-foreground text-base tracking-wider">DESPESAS</h1>
          {totalAll > 0 && (<span className="font-mono-ui text-[9px] text-overdue">TOTAL: {formatCurrency(totalAll)}</span>)}
        </div>
        <button onClick={() => setShowForm(true)} className="font-mono-ui text-[10px] text-paid bg-paid/10 px-3 py-1.5 rounded hover:bg-paid/20 transition-colors active:scale-95">
          + NOVA
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-20">
        {showForm && (<form onSubmit={handleAdd} className="px-4 py-4 border-b border-border space-y-3 animate-fade-up bg-background-deep">
            <div>
              <label className="font-mono-ui text-[10px] text-foreground-faint block mb-1">DESCRIÇÃO</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-secondary text-foreground font-mono text-sm px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring placeholder:text-foreground-faint/40" placeholder="Ex: Lâminas, Produto" autoFocus/>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="font-mono-ui text-[10px] text-foreground-faint block mb-1">VALOR (R$)</label>
                <input type="text" value={value} onChange={e => setValue(e.target.value)} className="w-full bg-secondary text-foreground font-mono text-sm px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring placeholder:text-foreground-faint/40" placeholder="25,00" inputMode="decimal"/>
              </div>
              <div className="flex-1">
                <label className="font-mono-ui text-[10px] text-foreground-faint block mb-1">DATA</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-secondary text-foreground font-mono-ui text-xs px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring"/>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-foreground text-primary-foreground font-mono-ui text-xs py-2.5 rounded hover:opacity-90 transition-opacity active:scale-[0.98]">
                ADICIONAR
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="font-mono-ui text-xs text-foreground-faint px-4 py-2.5 rounded hover:bg-secondary transition-colors active:scale-95">
                CANCELAR
              </button>
            </div>
          </form>)}

        {expenses.length === 0 && !showForm ? (<div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-up">
            <span className="text-2xl">📉</span>
            <span className="font-mono-ui text-[10px] text-foreground-faint tracking-widest">
              NENHUMA DESPESA
            </span>
            <span className="font-client text-sm text-foreground-faint/60">
              Registre seus gastos para acompanhar
            </span>
          </div>) : (Object.entries(grouped).map(([dateKey, exps]) => (<div key={dateKey}>
              <div className="px-4 py-2 bg-secondary/30">
                <span className="font-mono-ui text-[9px] text-foreground-faint tracking-widest">{dateKey}</span>
              </div>
              {exps.map((exp, i) => (<div key={exp.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50 animate-row-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="font-client text-base text-foreground flex-1">{exp.name}</span>
                  <span className="font-client text-sm text-overdue mr-3">{formatCurrency(exp.value)}</span>
                  <button onClick={() => handleDelete(exp.id)} className="font-mono-ui text-[9px] text-overdue hover:text-overdue/80 transition-colors active:scale-95">
                    ✕
                  </button>
                </div>))}
            </div>)))}
      </div>

      <BottomNav />
    </div>);
}
