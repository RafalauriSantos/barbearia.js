import { useCallback, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
	formatCurrency,
	formatDateDisplay,
	formatDayKey,
	getAppointmentsForDay,
	getDaySummaryFromAppointments,
} from "@/lib/store";

const emptySummary = {
	totalReceived: 0,
	totalClients: 0,
	totalIncome: 0,
	totalExpenses: 0,
	paid: 0,
	pending: 0,
	toCollect: 0,
	overdue: 0,
};

export default function FinancialPage() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [summary, setSummary] = useState(emptySummary);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");

	const dayKey = formatDayKey(currentDate);

	const reload = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage("");
		try {
			const appointments = await getAppointmentsForDay(dayKey);
			const nextSummary = await getDaySummaryFromAppointments(
				dayKey,
				appointments,
			);
			setSummary(nextSummary);
		} catch (error) {
			setSummary(emptySummary);
			setErrorMessage(error.message || "Falha ao carregar resumo financeiro.");
		} finally {
			setIsLoading(false);
		}
	}, [dayKey]);

	useEffect(() => {
		reload();
	}, [reload]);

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

	const lucro = summary.totalIncome - summary.totalExpenses;

	return (
		<div className="app-shell flex flex-col min-h-[100dvh] bg-background">
			<header className="sticky top-0 z-50 bg-background border-b border-border">
				<div className="px-4 py-3 flex items-center justify-between">
					<h1 className="font-logo text-foreground text-base">FINANCEIRO</h1>
					<span className="font-mono-ui text-xs text-foreground-faint">
						{formatDateDisplay(currentDate)}
					</span>
				</div>
				<div className="px-4 pb-3 flex items-center justify-center gap-3">
					<button
						onClick={prevDay}
						className="w-7 h-7 flex items-center justify-center text-foreground-faint hover:text-foreground transition-colors">
						‹
					</button>
					<span className="font-mono-ui text-xs text-foreground-faint">
						{formatDateDisplay(currentDate)}
					</span>
					<button
						onClick={nextDay}
						className="w-7 h-7 flex items-center justify-center text-foreground-faint hover:text-foreground transition-colors">
						›
					</button>
				</div>
			</header>

			<div className="flex-1 overflow-y-auto pb-20 px-4 py-4 space-y-3">
				{errorMessage && (
					<div className="rounded border border-overdue/30 bg-overdue/10 px-3 py-2">
						<p className="font-mono-ui text-[10px] text-overdue">ERRO</p>
						<p className="font-client text-sm text-overdue mt-1">
							{errorMessage}
						</p>
					</div>
				)}

				{isLoading ?
					<div className="py-12 text-center font-mono-ui text-xs text-foreground-faint">
						CARREGANDO RESUMO
					</div>
				:	<>
						<div className="rounded border border-border bg-card px-4 py-3">
							<p className="font-mono-ui text-xs text-foreground-faint">
								RECEBIDO
							</p>
							<p className="font-value text-2xl text-paid">
								{formatCurrency(summary.totalReceived)}
							</p>
						</div>

						<div className="rounded border border-border bg-card px-4 py-3">
							<p className="font-mono-ui text-xs text-foreground-faint">
								FATURAMENTO
							</p>
							<p className="font-value text-2xl text-foreground">
								{formatCurrency(summary.totalIncome)}
							</p>
						</div>

						<div className="rounded border border-border bg-card px-4 py-3">
							<p className="font-mono-ui text-xs text-foreground-faint">
								DESPESAS
							</p>
							<p className="font-value text-2xl text-overdue">
								{formatCurrency(summary.totalExpenses)}
							</p>
						</div>

						<div className="rounded border border-border bg-card px-4 py-3">
							<p className="font-mono-ui text-xs text-foreground-faint">
								LUCRO ESTIMADO
							</p>
							<p
								className={`font-value text-2xl ${lucro >= 0 ? "text-paid" : "text-overdue"}`}>
								{formatCurrency(lucro)}
							</p>
						</div>

						<div className="rounded border border-border bg-background-deep px-4 py-3 grid grid-cols-2 gap-2">
							<p className="font-client text-sm text-foreground-faint">
								Clientes: {summary.totalClients}
							</p>
							<p className="font-client text-sm text-foreground-faint">
								Pagos: {summary.paid}
							</p>
							<p className="font-client text-sm text-foreground-faint">
								Pendentes: {summary.pending}
							</p>
							<p className="font-client text-sm text-foreground-faint">
								A cobrar: {formatCurrency(summary.toCollect)}
							</p>
						</div>
					</>
				}
			</div>

			<BottomNav />
		</div>
	);
}
