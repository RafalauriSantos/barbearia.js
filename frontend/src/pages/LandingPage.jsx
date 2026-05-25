import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LandingPage() {
	const navigate = useNavigate();
	const handleStart = () => navigate("/login");

	return (
		<div className="min-h-[100dvh] bg-background-deep px-4 py-4 text-foreground">
			<div className="mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-[960px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl shadow-black/30">
				<section className="flex flex-1 flex-col px-5 pb-5 pt-6">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="font-mono-ui text-[10px] uppercase text-paid">
								Kash Flow
							</p>
							<h1 className="mt-2 font-logo text-4xl leading-[0.95] text-foreground">
								Agenda e caixa da barbearia.
							</h1>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<ThemeToggle className="h-11 w-11" />
							<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-paid/40 bg-paid/10 font-value text-xl text-paid">
								K
							</span>
						</div>
					</div>

					<p className="mt-4 max-w-[22rem] font-client text-sm leading-relaxed text-foreground-faint">
						Controle o dia por horário, barbeiro e pagamento sem abrir uma tela
						pesada de gestão.
					</p>

					<div className="mt-6 rounded-lg border border-border bg-card p-3">
						<div className="flex items-center justify-between border-b border-border pb-3">
							<div>
								<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
									Hoje
								</p>
								<p className="font-logo text-lg text-foreground">Agenda</p>
							</div>
							<p className="font-value text-xl text-paid">R$ 420</p>
						</div>

						<div className="mt-3 space-y-2">
							{[
								["09:00", "Corte", "Pago"],
								["10:30", "Barba", "Aberto"],
								["14:00", "Corte + Barba", "Fiado"],
							].map(([time, service, status]) => (
								<div
									key={time}
									className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-md bg-background-deep px-3 py-3">
									<span className="font-mono-ui text-xs text-foreground">
										{time}
									</span>
									<span className="truncate font-client text-sm text-foreground-faint">
										{service}
									</span>
									<span
										className={`rounded-full border px-2 py-0.5 font-mono-ui text-[9px] ${
											status === "Pago" ? "border-paid/30 bg-paid/10 text-paid"
											: status === "Fiado" ?
												"border-fiado/30 bg-fiado/10 text-fiado"
											:	"border-border text-foreground-faint"
										}`}>
										{status}
									</span>
								</div>
							))}
						</div>
					</div>

					<div className="mt-auto pt-6">
						<button
							onClick={handleStart}
							className="w-full rounded-md bg-foreground px-6 py-3 font-mono-ui text-sm text-primary-foreground transition-transform active:scale-[0.99]">
							Criar acesso
						</button>
						<button
							onClick={() => navigate("/login")}
							className="mt-2 w-full rounded-md border border-border px-6 py-3 font-mono-ui text-xs text-foreground-faint">
							Entrar na conta
						</button>
					</div>
				</section>
			</div>
		</div>
	);
}
