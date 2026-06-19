import { useEffect, useRef, useState } from "react";
import {
	formatDateDisplay,
	getCachedProfile,
	isToday,
	loadProfile,
} from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import { DateStepper, IconButton } from "@/components/ScreenPrimitives";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandName } from "@/components/BrandName";

// Cabecalho da tela com dados do perfil e controle de data.
export function AppHeader({ currentDate, onPrevDay, onNextDay, onSettings }) {
	const initialProfileRef = useRef(null);
	if (initialProfileRef.current === null) {
		initialProfileRef.current = getCachedProfile() || false;
	}
	const initialProfile = initialProfileRef.current || undefined;
	const [profile, setProfile] = useState(initialProfile);
	const { user } = useAuth();

	useEffect(() => {
		let mounted = true;

		async function loadProfileData() {
			try {
				const data = await loadProfile({ force: Boolean(initialProfile) });
				if (mounted) {
					setProfile(data || {});
				}
			} catch {
				if (mounted) {
					setProfile({});
				}
			}
		}

		loadProfileData();
		window.addEventListener("focus", loadProfileData);
		window.addEventListener("profile-updated", loadProfileData);

		return () => {
			window.removeEventListener("focus", loadProfileData);
			window.removeEventListener("profile-updated", loadProfileData);
			mounted = false;
		};
	}, [initialProfile]);

	// Mostra "Hoje" quando a data atual esta selecionada.
	const dateLabel =
		isToday(currentDate) ?
			`Hoje, ${formatDateDisplay(currentDate)}`
		:	formatDateDisplay(currentDate);
	const displayName = profile?.barberName || user?.nome || "Usuário";
	return (
		<header className="z-50 shrink-0 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="font-mono-ui text-[10px] uppercase text-paid">
						Agenda
					</p>
					<h1 className="truncate text-foreground">
						<BrandName size="sm" />
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<span className="max-w-[118px] truncate rounded-md border border-border bg-card px-2.5 py-1.5 font-client text-xs text-foreground-faint">
						{displayName}
					</span>
					<ThemeToggle />
					<IconButton label="Configurações" onClick={onSettings}>
						⚙
					</IconButton>
				</div>
			</div>
			<DateStepper label={dateLabel} onPrev={onPrevDay} onNext={onNextDay} />
		</header>
	);
}
