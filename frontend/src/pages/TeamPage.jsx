import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { AdminDashboard } from "@/components/AdminDashboard";
import {
	DateStepper,
	EmptyState,
	IconButton,
	ScreenHeader,
} from "@/components/ScreenPrimitives";
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
				<ScreenHeader
					eyebrow="Equipe"
					title="Acesso restrito"
					action={
						<IconButton label="Voltar" onClick={() => navigate("/app")}>
							‹
						</IconButton>
					}
				/>

				<div className="flex-1 px-4 py-6">
					<EmptyState title="Acesso restrito ao administrador." />
				</div>

				<BottomNav />
			</div>
		);
	}

	return (
		<div className="app-shell flex min-h-[100dvh] flex-col bg-background">
			<ScreenHeader
				eyebrow="Equipe"
				title="Gestão"
				action={
					<IconButton
						label="Configurações"
						onClick={() => navigate("/settings")}>
						⚙
					</IconButton>
				}>
				<DateStepper
					label={formatDateDisplay(currentDate)}
					onPrev={prevDay}
					onNext={nextDay}
				/>
			</ScreenHeader>

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
