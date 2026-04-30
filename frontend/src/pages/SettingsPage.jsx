import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAllData, loadProfile, saveProfile } from "@/lib/store";

// Tela para editar dados basicos e resetar tudo.
export default function SettingsPage() {
	const navigate = useNavigate();
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
	return (
		<div className="app-shell min-h-[100dvh] bg-background">
			<header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
				<button
					onClick={() => navigate("/app")}
					className="font-mono-ui text-xs text-foreground-faint">
					VOLTAR
				</button>
				<span className="font-logo text-sm text-foreground">CONFIGURAÇÕES</span>
				<div className="w-12" />
			</header>

			<div className="px-4 py-6 space-y-6">
				{errorMessage && (
					<div className="rounded border border-overdue/30 bg-overdue/10 px-3 py-2">
						<p className="font-mono-ui text-[10px] text-overdue">ERRO</p>
						<p className="font-client text-sm text-overdue mt-1">
							{errorMessage}
						</p>
					</div>
				)}

				{isLoading && (
					<p className="font-mono-ui text-xs text-foreground-faint">
						Carregando perfil...
					</p>
				)}

				<section>
					<label className="font-mono-ui text-xs text-foreground-faint block mb-2">
						NOME NO KURT
					</label>
					<input
						type="text"
						value={shopName}
						onChange={(e) => setShopName(e.target.value)}
						onBlur={handleSaveProfile}
						className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
						disabled={isSaving || isLoading}
					/>
				</section>

				<section>
					<label className="font-mono-ui text-xs text-foreground-faint block mb-2">
						SEU NOME
					</label>
					<input
						type="text"
						value={barberName}
						onChange={(e) => setBarberName(e.target.value)}
						onBlur={handleSaveProfile}
						className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded border border-border"
						disabled={isSaving || isLoading}
					/>
				</section>

				<button
					onClick={handleSaveProfile}
					disabled={isSaving || isLoading}
					className="w-full bg-foreground text-primary-foreground font-mono-ui text-sm py-2 rounded">
					{isSaving ? "SALVANDO..." : "SALVAR"}
				</button>

				<button
					onClick={resetData}
					disabled={isSaving}
					className="w-full font-mono-ui text-sm text-overdue border border-overdue/30 py-2 rounded">
					RESETAR DADOS
				</button>
			</div>
		</div>
	);
}
