import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function TeamPage() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [appointments, setAppointments] = useState([]);
	const [barbers, setBarbers] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const hasLoadedRef = useRef(false);
	const [errorMessage, setErrorMessage] = useState("");
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.role === "admin";
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
			const list = await getAppointmentsForDayWithFilters(dayKey);
			setAppointments(list);
		} catch (error) {
			setAppointments([]);
			setErrorMessage(error.message || "Falha ao carregar dados da equipe.");
		} finally {
			setIsLoading(false);
			hasLoadedRef.current = true;
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
				barbers={teamBarbers}
				appointments={teamAppointments}
				isLoading={isLoading}
				errorMessage={errorMessage}
				onRetry={reloadAll}
				onReload={reloadAll}
			/>

			<BottomNav />
		</div>
	);
}
