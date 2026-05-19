import { useEffect, useState } from "react";
import { formatDateDisplay, isToday, loadProfile } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";

// Cabecalho da tela com dados do perfil e controle de data.
export function AppHeader({ currentDate, onPrevDay, onNextDay, onSettings }) {
	const [profile, setProfile] = useState();
	const { user } = useAuth();

	useEffect(() => {
		let mounted = true;

		async function loadProfileData() {
			try {
				const data = await loadProfile();
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
	}, []);

	// Mostra "Hoje" quando a data atual esta selecionada.
	const dateLabel =
		isToday(currentDate) ?
			`Hoje, ${formatDateDisplay(currentDate)}`
		:	formatDateDisplay(currentDate);
	return (
		<header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<h1 className="truncate font-logo text-lg leading-tight text-foreground">
						{profile?.shopName || "Kurt"}
					</h1>
				</div>
				<div className="flex items-center gap-2">
					<span className="max-w-[118px] truncate rounded-md border border-border bg-card px-2.5 py-1.5 font-client text-xs text-foreground-faint">
						{user?.nome || profile?.barberName || "Usuário"}
					</span>
					<button
						onClick={onSettings}
						className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-sm text-foreground"
						aria-label="Configurações">
						⚙
					</button>
				</div>
			</div>
			<div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background-deep p-1">
				<button
					onClick={onPrevDay}
					className="flex h-8 w-10 items-center justify-center rounded-md text-xl text-foreground-faint transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
					aria-label="Dia anterior">
					‹
				</button>
				<span className="min-w-0 flex-1 truncate px-2 text-center font-mono-ui text-[11px] text-foreground">
					{dateLabel}
				</span>
				<button
					onClick={onNextDay}
					className="flex h-8 w-10 items-center justify-center rounded-md text-xl text-foreground-faint transition-colors hover:bg-secondary hover:text-foreground active:scale-95"
					aria-label="Próximo dia">
					›
				</button>
			</div>
		</header>
	);
}
