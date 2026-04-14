import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadProfile, saveProfile } from "@/lib/store";
export default function SettingsPage() {
	const navigate = useNavigate();
	const profile = loadProfile();
	const [shopName, setShopName] = useState(profile?.shopName || "");
	const [barberName, setBarberName] = useState(profile?.barberName || "");
	const inviteLink = `${window.location.origin}/invite/XYZ123`;
	const handleSaveProfile = () => {
		const cleanShopName = shopName.trim();
		const cleanBarberName = barberName.trim();
		if (!cleanShopName || !cleanBarberName) return;
		saveProfile({ shopName: cleanShopName, barberName: cleanBarberName });
	};
	const copyLink = () => {
		navigator.clipboard.writeText(inviteLink);
	};
	return (
		<div className="app-shell min-h-[100dvh] bg-background">
			{/* Header */}
			<header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
				<button
					onClick={() => navigate("/app")}
					className="font-mono-ui text-xs text-foreground-faint hover:text-foreground transition-colors active:scale-95">
					← VOLTAR
				</button>
				<span className="font-logo text-sm text-foreground tracking-wider">
					CONFIGURAÇÕES
				</span>
				<div className="w-12" />
			</header>

			<div className="px-4 py-6 space-y-8 animate-fade-up">
				{/* Shop name */}
				<section>
					<label className="font-mono-ui text-[10px] text-foreground-faint block mb-2">
						NOME NO KURT
					</label>
					<input
						type="text"
						value={shopName}
						onChange={(e) => setShopName(e.target.value)}
						onBlur={handleSaveProfile}
						className="w-full bg-secondary text-foreground font-mono text-sm px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring"
					/>
				</section>

				<section>
					<label className="font-mono-ui text-[10px] text-foreground-faint block mb-2">
						SEU NOME
					</label>
					<input
						type="text"
						value={barberName}
						onChange={(e) => setBarberName(e.target.value)}
						onBlur={handleSaveProfile}
						className="w-full bg-secondary text-foreground font-mono text-sm px-3 py-2.5 rounded outline-none focus:ring-1 focus:ring-ring"
					/>
				</section>

				<button
					onClick={handleSaveProfile}
					className="w-full bg-foreground text-primary-foreground font-mono-ui text-xs py-3 rounded hover:opacity-90 transition-opacity active:scale-[0.98]">
					SALVAR
				</button>

				{/* Invite link */}
				<section>
					<label className="font-mono-ui text-[10px] text-foreground-faint block mb-2">
						LINK DE CONVITE
					</label>
					<div className="flex gap-2">
						<input
							type="text"
							readOnly
							value={inviteLink}
							className="flex-1 bg-secondary text-foreground-faint font-mono text-[11px] px-3 py-2.5 rounded outline-none truncate"
						/>
						<button
							onClick={copyLink}
							className="font-mono-ui text-[10px] text-paid bg-paid/10 px-4 py-2.5 rounded hover:bg-paid/20 transition-colors active:scale-95 shrink-0">
							COPIAR
						</button>
					</div>
					<p className="font-mono-ui text-[9px] text-foreground-faint/60 mt-1.5">
						Compartilhe este link para seu time se cadastrar no KURT.
					</p>
				</section>

				{/* Barbers list */}
				<section>
					<label className="font-mono-ui text-[10px] text-foreground-faint block mb-3">
						BARBEIROS
					</label>
					<div className="space-y-2">
						{[
							{ name: "Pedro", role: "owner", commission: 50 },
							{ name: "Lucas", role: "employee", commission: 50 },
						].map((barber) => (
							<div
								key={barber.name}
								className="flex items-center justify-between bg-secondary px-3 py-2.5 rounded">
								<div className="flex items-center gap-2">
									<span className="font-client text-sm text-foreground">
										{barber.name}
									</span>
									<span className="font-mono-ui text-[8px] text-foreground-faint bg-background px-1.5 py-0.5 rounded">
										{barber.role === "owner" ? "DONO" : "BARBEIRO"}
									</span>
								</div>
								<span className="font-mono-ui text-[10px] text-foreground-faint">
									{barber.commission}%
								</span>
							</div>
						))}
					</div>
				</section>

				{/* Logout */}
				<button
					onClick={() => {
						localStorage.clear();
						navigate("/");
					}}
					className="w-full font-mono-ui text-xs text-overdue border border-overdue/20 py-3 rounded hover:bg-overdue/10 transition-colors active:scale-[0.98]">
					RESETAR DADOS
				</button>
			</div>
		</div>
	);
}
