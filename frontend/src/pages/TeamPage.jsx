import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { AdminDashboard } from "@/components/AdminDashboard";
import {
	formatDateDisplay,
	formatDayKey,
	getAppointmentsForDayWithFilters,
	loadBarbers,
	loadFinancialSummary,
} from "@/lib/store";
import { useAuth } from "@/context/AuthContext";

export default function TeamPage() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [appointments, setAppointments] = useState([]);
	const [barbers, setBarbers] = useState([]);
	const [financialSummary, setFinancialSummary] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";
	const dayKey = formatDayKey(currentDate);

	const reload = useCallback(async () => {
		setIsLoading(true);
		setErrorMessage("");
		try {
			const list = await getAppointmentsForDayWithFilters(dayKey);
			setAppointments(list);
			const nextFinancialSummary = await loadFinancialSummary({
				start_date: dayKey,
				end_date: dayKey,
			});
			setFinancialSummary(nextFinancialSummary);
		} catch (error) {
			setAppointments([]);
			setFinancialSummary(null);
			setErrorMessage(error.message || "Falha ao carregar dados da equipe.");
		} finally {
			setIsLoading(false);
		}
	}, [dayKey]);

	const reloadBarbers = useCallback(async () => {
		try {
			const list = await loadBarbers();
			setBarbers(list);
			return list;
		} catch (error) {
			setBarbers([]);
			setErrorMessage(error.message || "Falha ao carregar barbeiros.");
			return [];
		}
	}, []);

	const reloadAll = useCallback(async () => {
		await Promise.all([reload(), reloadBarbers()]);
	}, [reload, reloadBarbers]);

	useEffect(() => {
		if (!isAdmin) return;
		reloadAll();
	}, [isAdmin, reloadAll]);

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

	if (!isAdmin) {
		return (
			<div className="app-shell flex min-h-[100dvh] flex-col bg-background">
				<header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
								Equipe
							</p>
							<h1 className="mt-1 font-logo text-xl leading-tight text-foreground">
								Acesso restrito
							</h1>
						</div>
						<button
							onClick={() => navigate("/app")}
							className="rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
							Voltar
						</button>
					</div>
				</header>

				<div className="flex-1 px-4 py-6">
					<div className="rounded-lg border border-border bg-card px-4 py-6 text-center">
						<p className="font-mono-ui text-xs text-foreground-faint">
							Acesso restrito ao administrador.
						</p>
					</div>
				</div>

				<BottomNav />
			</div>
		);
	}

	return (
		<div className="app-shell flex min-h-[100dvh] flex-col bg-background">
			<header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							Equipe
						</p>
						<h1 className="mt-1 font-logo text-xl leading-tight text-foreground">
							Gestao
						</h1>
					</div>
					<button
						onClick={() => navigate("/settings")}
						className="rounded-md border border-border bg-card px-3 py-2 font-mono-ui text-[10px] text-foreground-faint">
						Configurar
					</button>
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

			<AdminDashboard
				dayKey={dayKey}
				barbers={barbers}
				appointments={appointments}
				financialSummary={financialSummary}
				isLoading={isLoading}
				errorMessage={errorMessage}
				onRetry={reloadAll}
				onReload={reloadAll}
			/>

			<BottomNav />
		</div>
	);
}
