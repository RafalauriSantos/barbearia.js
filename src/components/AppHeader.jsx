import { formatDateDisplay, isToday, loadProfile } from '@/lib/store';
export function AppHeader({ currentDate, onPrevDay, onNextDay, onSettings }) {
    const profile = loadProfile();
    const dateLabel = isToday(currentDate)
        ? `Hoje, ${formatDateDisplay(currentDate)}`
        : formatDateDisplay(currentDate);
    return (<header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-mono-ui text-[10px] text-foreground-faint tracking-widest truncate max-w-[120px]">
          {profile?.shopName?.toUpperCase() || 'BARBEARIA'}
        </span>
        <span className="font-client text-sm text-foreground">
          {profile?.barberName || 'Barbeiro'}
        </span>
        <button onClick={onSettings} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary transition-colors active:scale-95" aria-label="Configurações">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground-faint">
            <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-center px-4 pb-3 gap-3">
        <button onClick={onPrevDay} className="w-7 h-7 flex items-center justify-center text-foreground-faint hover:text-foreground transition-colors active:scale-95">
          ‹
        </button>
        <span className="font-mono-ui text-xs text-foreground-faint">
          {dateLabel}
        </span>
        <button onClick={onNextDay} className="w-7 h-7 flex items-center justify-center text-foreground-faint hover:text-foreground transition-colors active:scale-95">
          ›
        </button>
      </div>
    </header>);
}
