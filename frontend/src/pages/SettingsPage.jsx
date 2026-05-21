import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
	IconButton,
	Notice,
	ScreenHeader,
} from "@/components/ScreenPrimitives";
import { clearAllData, loadProfile, saveProfile } from "@/lib/store";

// Tela para editar dados basicos e resetar tudo.
export default function SettingsPage() {
	const navigate = useNavigate();
	const { logout, user } = useAuth();
	const [shopName, setShopName] = useState("");
	const [barberName, setBarberName] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		let mounted = true;

		async function fetchProfile() {
			try {
				const profile = await loadProfile();
				if (mounted) {
					setShopName(profile?.shopName || "");
					setBarberName(profile?.barberName || "");
				}
			} catch (error) {
				if (mounted) {
					setErrorMessage(error.message || "Falha ao carregar perfil.");
				}
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		}

		fetchProfile();

		return () => {
			mounted = false;
		};
	}, []);

	const handleSaveProfile = async () => {
		// Salva nome da barbearia e nome do barbeiro.
		const cleanShopName = shopName.trim();
		const cleanBarberName = barberName.trim();
		if (!cleanShopName || !cleanBarberName || isSaving) return;

		setIsSaving(true);
		setErrorMessage("");
		try {
			await saveProfile({
				shopName: cleanShopName,
				barberName: cleanBarberName,
			});

			// Notify other parts of the app (header) that profile changed.
			window.dispatchEvent(new Event("profile-updated"));
		} catch (error) {
			setErrorMessage(error.message || "Falha ao salvar perfil.");
		} finally {
			setIsSaving(false);
		}
	};
	const resetData = async () => {
		// Limpa os dados locais e volta para o inicio.
		if (isSaving) return;

		setIsSaving(true);
		setErrorMessage("");
		try {
			await clearAllData();
		} catch (error) {
			setErrorMessage(error.message || "Falha ao resetar dados.");
			setIsSaving(false);
			return;
		}

		navigate("/");
	};

	const handleLogout = () => {
		logout();
		navigate("/login", { replace: true });
	};

	return (
		<div className="app-shell min-h-[100dvh] bg-background">
			<ScreenHeader
				eyebrow="Conta"
				title="Configurações"
				action={
					<IconButton label="Voltar" onClick={() => navigate("/app")}>
						‹
					</IconButton>
				}
			/>

			<div className="space-y-4 px-4 py-5">
				{errorMessage && (
					<Notice tone="error" title="Erro">
						{errorMessage}
					</Notice>
				)}

				{isLoading && (
					<p className="rounded-lg border border-border bg-card px-4 py-3 font-mono-ui text-xs text-foreground-faint">
						Carregando perfil...
					</p>
				)}

				<section className="rounded-lg border border-border bg-card p-4">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Dados da barbearia
					</p>
					<label className="mt-4 block font-mono-ui text-[10px] text-foreground-faint">
						Nome exibido no topo
					</label>
					<input
						type="text"
						value={shopName}
						onChange={(e) => setShopName(e.target.value)}
						className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
						disabled={isSaving || isLoading}
					/>
				</section>

				<section className="rounded-lg border border-border bg-card p-4">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Dados do usuário
					</p>
					<label className="mt-4 block font-mono-ui text-[10px] text-foreground-faint">
						Nome na agenda
					</label>
					<input
						type="text"
						value={barberName}
						onChange={(e) => setBarberName(e.target.value)}
						className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
						disabled={isSaving || isLoading}
					/>
					<div className="mt-4 rounded-md bg-background-deep px-3 py-3">
						<p className="font-mono-ui text-[10px] text-foreground-faint">
							Conta logada
						</p>
						<p className="mt-1 truncate font-client text-sm text-foreground">
							{user?.nome || user?.email || "Usuario"}
						</p>
						<p className="mt-1 font-mono-ui text-[10px] text-foreground-faint">
							{user?.role || "perfil"} · {user?.email || "sem email"}
						</p>
					</div>
				</section>

				<button
					onClick={handleSaveProfile}
					disabled={isSaving || isLoading}
					className="w-full rounded-md bg-foreground px-4 py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
					{isSaving ? "Salvando..." : "Salvar alterações"}
				</button>

				<section className="rounded-lg border border-border bg-card p-4">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Sessão
					</p>
					<button
						onClick={handleLogout}
						disabled={isSaving}
						className="mt-3 w-full rounded-md border border-border bg-background-deep px-4 py-3 font-mono-ui text-sm text-foreground">
						Sair da conta
					</button>
				</section>

				<section className="rounded-lg border border-overdue/30 bg-overdue/10 p-4">
					<p className="font-mono-ui text-[10px] uppercase text-overdue">
						Ações perigosas
					</p>
					<p className="mt-2 font-client text-sm text-foreground-faint">
						Use somente se precisar limpar os dados locais deste ambiente.
					</p>
					<button
						onClick={resetData}
						disabled={isSaving}
						className="mt-4 w-full rounded-md border border-overdue/40 bg-background px-4 py-3 font-mono-ui text-sm text-overdue disabled:opacity-60">
						Resetar dados
					</button>
				</section>
			</div>
		</div>
	);
}
