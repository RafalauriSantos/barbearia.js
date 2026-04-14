import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAllData, loadProfile, saveProfile } from "@/lib/store";
export default function SettingsPage() {
	const navigate = useNavigate();
	const profile = loadProfile();
	const [shopName, setShopName] = useState(profile?.shopName || "");
	const [barberName, setBarberName] = useState(profile?.barberName || "");
	const handleSaveProfile = () => {
		const cleanShopName = shopName.trim();
		const cleanBarberName = barberName.trim();
		if (!cleanShopName || !cleanBarberName) return;
		saveProfile({ shopName: cleanShopName, barberName: cleanBarberName });
	};
	const resetData = () => {
		clearAllData();
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
				<span className="font-logo text-sm text-foreground">
					CONFIGURAÇÕES
				</span>
				<div className="w-12" />
			</header>

			<div className="px-4 py-6 space-y-6">
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
					/>
				</section>

				<button
					onClick={handleSaveProfile}
					className="w-full bg-foreground text-primary-foreground font-mono-ui text-sm py-2 rounded">
					SALVAR
				</button>

				<button
					onClick={resetData}
					className="w-full font-mono-ui text-sm text-overdue border border-overdue/30 py-2 rounded">
					RESETAR DADOS
				</button>
			</div>
		</div>
	);
}
