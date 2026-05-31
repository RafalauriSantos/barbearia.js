import { useCallback, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { FinancialSummaryCompact } from "@/components/FinancialSummaryCompact";
import {
	DateStepper,
	Notice,
	ScreenHeader,
} from "@/components/ScreenPrimitives";
import {
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
	const quantidade =
		isAdminSummary ?
			summary.quantidade_atendimentos_pagos
		:	summary?.quantidade_atendimentos || 0;

	return (
		<div className="app-shell flex flex-col overflow-hidden bg-background">
			<ScreenHeader eyebrow="Caixa" title="Financeiro">
				<DateStepper
					label={formatDateDisplay(currentDate)}
					onPrev={prevDay}
					onNext={nextDay}
				/>
			</ScreenHeader>

			<div className="min-h-0 flex-1 overflow-y-auto safe-bottom">
				{errorMessage && (
					<div className="mx-4 mt-4">
						<Notice tone="error" title="Erro">
							{errorMessage}
						</Notice>
					</div>
				)}

				<FinancialSummaryCompact
					summary={summary}
					isLoading={isLoading}
					showBreakdown
				/>

				{!isLoading && summary && (
					<div className="space-y-3 px-4 pb-6">
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
