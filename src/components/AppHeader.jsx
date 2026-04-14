import { formatDateDisplay, isToday, loadProfile } from "@/lib/store";
export function AppHeader({ currentDate, onPrevDay, onNextDay, onSettings }) {
	const profile = loadProfile();
	const dateLabel =
		isToday(currentDate) ?
			`Hoje, ${formatDateDisplay(currentDate)}`
		:	formatDateDisplay(currentDate);
	return (
		<header className="sticky top-0 z-50 bg-background border-b border-border">
			<div className="flex items-center justify-between px-4 py-3">
				<span className="font-mono-ui text-xs text-foreground-faint truncate max-w-[120px]">
					{profile?.shopName?.toUpperCase() || "KURT"}
				</span>
				<span className="font-client text-sm text-foreground">
					{profile?.barberName || "Barbeiro"}
				</span>
				<button
					onClick={onSettings}
					className="h-8 px-2 rounded border border-border text-xs"
					aria-label="Configurações">
					CONFIG
				</button>
			</div>

			<div className="flex items-center justify-center px-4 pb-3 gap-3">
				<button
					onClick={onPrevDay}
					className="w-7 h-7 flex items-center justify-center text-foreground-faint hover:text-foreground transition-colors active:scale-95">
					‹
				</button>
				<span className="font-mono-ui text-xs text-foreground-faint">
					{dateLabel}
				</span>
				<button
					onClick={onNextDay}
					className="w-7 h-7 flex items-center justify-center text-foreground-faint hover:text-foreground transition-colors active:scale-95">
					›
				</button>
			</div>
		</header>
	);
}
