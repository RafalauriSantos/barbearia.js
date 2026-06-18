import { ThemeToggle } from "@/components/ThemeToggle";

export function IconButton({
	label,
	children,
	onClick,
	disabled = false,
	type = "button",
	tone = "default",
	className = "",
}) {
	const tones = {
		default: "border-border bg-card text-foreground-faint hover:text-foreground",
		primary: "border-paid/40 bg-paid/10 text-paid hover:bg-paid/15",
		danger: "border-overdue/40 bg-overdue/10 text-overdue hover:bg-overdue/15",
		quiet: "border-transparent bg-transparent text-foreground-faint hover:bg-secondary hover:text-foreground",
	};

	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			title={label}
			className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-mono-ui text-base leading-none transition-colors disabled:opacity-50 ${tones[tone]} ${className}`}>
			{children}
		</button>
	);
}

export function ScreenHeader({
	eyebrow,
	title,
	action,
	children,
	showThemeToggle = false,
}) {
	return (
		<header className="z-50 shrink-0 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					{eyebrow && (
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							{eyebrow}
						</p>
					)}
					<h1 className="mt-1 truncate font-logo text-xl leading-tight text-foreground">
						{title}
					</h1>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{showThemeToggle && <ThemeToggle />}
					{action}
				</div>
			</div>
			{children}
		</header>
	);
}

export function DateStepper({ label, onPrev, onNext }) {
	return (
		<div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-background-deep p-1 md:max-w-[520px]">
			<IconButton label="Dia anterior" onClick={onPrev} tone="quiet">
				‹
			</IconButton>
			<span className="min-w-0 flex-1 truncate px-2 text-center font-mono-ui text-[11px] text-foreground">
				{label}
			</span>
			<IconButton label="Próximo dia" onClick={onNext} tone="quiet">
				›
			</IconButton>
		</div>
	);
}

export function Notice({ tone = "error", title, children, action }) {
	const tones = {
		error: "border-overdue/30 bg-overdue/10 text-overdue",
		success: "border-paid/30 bg-paid/10 text-paid",
		neutral: "border-border bg-card text-foreground-faint",
	};

	return (
		<div className={`rounded-lg border px-4 py-3 ${tones[tone]}`}>
			{title && (
				<p className="font-mono-ui text-[10px] uppercase leading-none">
					{title}
				</p>
			)}
			<div className="mt-1 font-client text-sm leading-snug">{children}</div>
			{action && <div className="mt-3">{action}</div>}
		</div>
	);
}

export function EmptyState({ title, hint, action }) {
	return (
		<div className="rounded-lg border border-dashed border-border bg-card/70 px-4 py-10 text-center">
			<p className="font-mono-ui text-xs text-foreground-faint">{title}</p>
			{hint && (
				<p className="mx-auto mt-2 max-w-[280px] font-client text-sm leading-snug text-foreground-faint">
					{hint}
				</p>
			)}
			{action && <div className="mt-4 flex justify-center">{action}</div>}
		</div>
	);
}

export function Skeleton({ className = "" }) {
	return (
		<div
			aria-hidden="true"
			className={`skeleton-shimmer rounded-md ${className}`}
		/>
	);
}

export function LoadingCard({ label = "Carregando", rows = 3 }) {
	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<p className="sr-only">{label}</p>
			<div className="flex items-center justify-between gap-4">
				<div className="min-w-0 flex-1">
					<Skeleton className="h-3 w-24" />
					<Skeleton className="mt-3 h-8 w-40 max-w-full" />
				</div>
				<Skeleton className="h-10 w-14 shrink-0" />
			</div>
			<div className="mt-4 space-y-2">
				{Array.from({ length: rows }).map((_, index) => (
					<Skeleton
						key={index}
						className={index === rows - 1 ? "h-10 w-4/5" : "h-10 w-full"}
					/>
				))}
			</div>
		</div>
	);
}
