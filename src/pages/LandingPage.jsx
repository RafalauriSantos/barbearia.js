import { useNavigate } from "react-router-dom";
export default function LandingPage() {
	const navigate = useNavigate();
	const handleStart = () => navigate("/app");
	return (
		<div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 py-12">
			<div className="animate-fade-up text-center max-w-sm">
				<p className="font-mono-ui text-[9px] text-paid tracking-[0.4em] mb-3">
					GESTÃO PARA BARBEARIAS
				</p>
				<h1 className="font-logo text-4xl sm:text-5xl text-foreground tracking-wider">
					CUTLEDGER
				</h1>
				<p className="font-client text-base text-muted-foreground mt-4 leading-relaxed">
					Controle sua agenda, serviços e finanças — rápido como um bloco de
					notas.
				</p>

				<button
					onClick={handleStart}
					className="w-full bg-foreground text-primary-foreground font-mono-ui text-xs px-8 py-3.5 rounded hover:opacity-90 transition-opacity active:scale-[0.98] mt-10">
					COMEÇAR
				</button>

				<div className="flex items-center justify-center gap-6 mt-8">
					{["📋 Agenda", "✂ Serviços", "💰 Financeiro"].map((f) => (
						<span
							key={f}
							className="font-mono-ui text-[9px] text-muted-foreground tracking-wider">
							{f}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}
