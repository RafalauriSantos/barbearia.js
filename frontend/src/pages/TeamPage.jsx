import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { AdminDashboard } from "@/components/AdminDashboard";
import {
	EmptyState,
	IconButton,
	ScreenHeader,
} from "@/components/ScreenPrimitives";
import {
	formatDayKey,
	getCachedAppointmentsForDay,
	getCachedBarbers,
	getAppointmentsForDayWithFilters,
	loadBarbers,
} from "@/lib/store";
import { useAuth } from "@/context/AuthContext";

function normalizeText(value) {
	return String(value || "")
		.trim()
		.toLowerCase();
}

function isOwnerBarber(barber, user) {
	if (!barber || !user) return false;

	if (user.barbeiro_id && barber.id === user.barbeiro_id) return true;
	if (user.id && barber.usuario_id === user.id) return true;

	const barberEmail = normalizeText(barber.email);
	const userEmail = normalizeText(user.email);
	if (barberEmail && userEmail && barberEmail === userEmail) return true;

	const barberName = normalizeText(barber.name || barber.nome);
	const userName = normalizeText(user.nome || user.name);
	return Boolean(barberName && userName && barberName === userName);
}

function getOwnerBarberIds(barbers, user) {
	const ids = new Set();
	if (user?.barbeiro_id) ids.add(user.barbeiro_id);
	for (const barber of barbers) {
		if (isOwnerBarber(barber, user)) ids.add(barber.id);
	}
	return ids;
}

function formatTeamDate(date) {
	const months = [
		"janeiro",
		"fevereiro",
		"março",
		"abril",
		"maio",
		"junho",
		"julho",
		"agosto",
		"setembro",
		"outubro",
		"novembro",
		"dezembro",
	];
	return `${date.getDate()} de ${months[date.getMonth()]}`;
}

export default function TeamPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";
	const initialDate = new Date();
	const initialDayKey = formatDayKey(initialDate);
	const initialAppointments = getCachedAppointmentsForDay(initialDayKey);
	const initialBarbers = getCachedBarbers();
	const [currentDate, setCurrentDate] = useState(initialDate);
	const [appointments, setAppointments] = useState(initialAppointments || []);
	const [barbers, setBarbers] = useState(initialBarbers || []);
	const [isLoading, setIsLoading] = useState(
		!(initialAppointments && initialBarbers),
	);
	const hasLoadedRef = useRef(Boolean(initialAppointments && initialBarbers));
	const [errorMessage, setErrorMessage] = useState("");
	const [teamSheetOpen, setTeamSheetOpen] = useState(false);
	const dayKey = formatDayKey(currentDate);
	const ownerBarberIds = useMemo(
		() => getOwnerBarberIds(barbers, user),
		[barbers, user],
	);
	const teamBarbers = useMemo(
		() => barbers.filter((barber) => !ownerBarberIds.has(barber.id)),
		[barbers, ownerBarberIds],
	);
	const teamAppointments = useMemo(
		() =>
			appointments.filter(
				(appointment) => !ownerBarberIds.has(appointment.barbeiro_id),
			),
		[appointments, ownerBarberIds],
	);

	const reload = useCallback(async () => {
		const hasLoaded = hasLoadedRef.current;
		setIsLoading(!hasLoaded);
		setErrorMessage("");
		try {
			const list = await getAppointmentsForDayWithFilters(dayKey, {}, {
				force: true,
			});
			setAppointments(list);
		} catch (error) {
			if (!hasLoaded) {
				setAppointments([]);
			}
			setErrorMessage(error.message || "Falha ao carregar dados da equipe.");
		} finally {
			setIsLoading(false);
			hasLoadedRef.current = true;
		}
	}, [dayKey]);

	const reloadBarbers = useCallback(async () => {
		const hasLoaded = hasLoadedRef.current;
		try {
			const list = await loadBarbers({ force: true });
			setBarbers(list);
			return list;
		} catch (error) {
			if (!hasLoaded) {
				setBarbers([]);
			}
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
			<div className="app-shell flex flex-col overflow-hidden bg-background">
				<ScreenHeader
					eyebrow="Equipe"
					title="Acesso restrito"
					action={
						<IconButton label="Voltar" onClick={() => navigate("/app")}>
							‹
						</IconButton>
					}
				/>

				<div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 safe-bottom">
					<EmptyState title="Acesso restrito ao administrador." />
				</div>

				<BottomNav />
			</div>
		);
	}

	return (
		<div className="app-shell flex flex-col overflow-hidden bg-background">
			<header className="z-50 shrink-0 border-b border-border bg-background/95 px-4 py-6 backdrop-blur">
				<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
					<h1 className="min-w-0 truncate font-logo text-lg leading-none text-foreground sm:text-xl">
						Equipe
					</h1>
					<div className="flex items-center justify-center gap-1.5 sm:gap-3">
						<IconButton label="Dia anterior" onClick={prevDay} className="h-9 w-9">
							<ChevronLeft aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
						</IconButton>
						<span className="w-[88px] text-center font-client text-[13px] font-semibold text-foreground sm:w-[120px] sm:text-sm">
							{formatTeamDate(currentDate)}
						</span>
						<IconButton label="Próximo dia" onClick={nextDay} className="h-9 w-9">
							<ChevronRight aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
						</IconButton>
					</div>
					<IconButton
						label="Gerenciar equipe"
						onClick={() => setTeamSheetOpen(true)}
						className="h-9 w-9 justify-self-end">
						<Settings aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
					</IconButton>
				</div>
			</header>

			<AdminDashboard
				dayKey={dayKey}
				barbers={teamBarbers}
				appointments={teamAppointments}
				isLoading={isLoading}
				errorMessage={errorMessage}
				onRetry={reloadAll}
				onReload={reloadAll}
				teamSheetOpen={teamSheetOpen}
				onTeamSheetOpenChange={setTeamSheetOpen}
			/>

			<BottomNav variant="minimal" />
		</div>
	);
}
