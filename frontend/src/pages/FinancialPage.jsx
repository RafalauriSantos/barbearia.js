import { useCallback, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { FinancialSummaryCompact } from "@/components/FinancialSummaryCompact";
import {
	formatCurrency,
	formatDateDisplay,
	formatDayKey,
	loadFinancialSummary,
} from "@/lib/store";

export default function FinancialPage() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [summary, setSummary] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");

	const dayKey = formatDayKey(currentDate);

	const reload = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage("");
		try {
			const nextSummary = await loadFinancialSummary({
				start_date: dayKey,
				end_date: dayKey,
			});
			setSummary(nextSummary);
		} catch (error) {
			setSummary(null);
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

	const isAdminSummary = summary?.type === "admin";
	const totalPago =
		isAdminSummary ? summary.total_pago_geral : summary?.total_pago || 0;
	const parteBarbearia =
		isAdminSummary ? summary.total_barbearia : summary?.parte_barbearia || 0;
	const parteBarbeiros =
		isAdminSummary ? summary.total_barbeiros : summary?.parte_barbeiro || 0;
	const quantidade =
		isAdminSummary ?
			summary.quantidade_atendimentos_pagos
		:	summary?.quantidade_atendimentos || 0;

	return (
		<div className="app-shell flex flex-col min-h-[100dvh] bg-background">
			<header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							Caixa
						</p>
						<h1 className="mt-1 font-logo text-xl leading-tight text-foreground">
							Financeiro
						</h1>
					</div>
				</div>
				<div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-background-deep p-1.5">
					<button
						onClick={prevDay}
						className="flex h-9 w-10 items-center justify-center rounded-md text-xl text-foreground-faint hover:bg-secondary hover:text-foreground">
						‹
					</button>
					<span className="min-w-0 flex-1 truncate px-2 text-center font-mono-ui text-xs text-foreground">
						{formatDateDisplay(currentDate)}
					</span>
					<button
						onClick={nextDay}
						className="flex h-9 w-10 items-center justify-center rounded-md text-xl text-foreground-faint hover:bg-secondary hover:text-foreground">
						›
					</button>
				</div>
			</header>

			<div className="flex-1 overflow-y-auto pb-20">
				{errorMessage && (
					<div className="mx-4 mt-4 rounded-lg border border-overdue/30 bg-overdue/10 px-4 py-3">
						<p className="font-mono-ui text-[10px] text-overdue">Erro</p>
						<p className="mt-1 font-client text-sm text-overdue">
							{errorMessage}
						</p>
					</div>
				)}

				<FinancialSummaryCompact
					summary={summary}
					isLoading={isLoading}
					showBreakdown
				/>

				{!isLoading && summary && (
					<div className="space-y-3 px-4 pb-6">
						<div className="rounded-lg border border-border bg-card p-4">
							<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
								Total pago
							</p>
							<p className="mt-1 font-value text-3xl leading-none text-paid">
								{formatCurrency(totalPago)}
							</p>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="rounded-lg border border-border bg-card p-4">
								<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
									Barbearia
								</p>
								<p className="mt-1 font-value text-xl text-foreground">
									{formatCurrency(parteBarbearia)}
								</p>
							</div>

							<div className="rounded-lg border border-border bg-card p-4">
								<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
									{isAdminSummary ? "Equipe" : "Comissão"}
								</p>
								<p className="mt-1 font-value text-xl text-foreground">
									{formatCurrency(parteBarbeiros)}
								</p>
							</div>
						</div>

						<div className="rounded-lg border border-border bg-background-deep p-4">
							<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
								Base do resumo
							</p>
							<p className="mt-2 font-client text-sm text-foreground-faint">
								{quantidade} atendimentos pagos entram no financeiro deste dia.
							</p>
						</div>
					</div>
				)}
			</div>

			<BottomNav />
		</div>
	);
}
