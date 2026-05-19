import { useNavigate } from "react-router-dom";
export default function LandingPage() {
	const navigate = useNavigate();
	// Entra na tela principal da agenda.
	const handleStart = () => navigate("/app");
	return (
		<div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 py-10">
			<div className="text-center w-full max-w-sm border border-border rounded p-6 bg-card">
				<p className="font-mono-ui text-xs text-foreground-faint mb-2">
					AGENDA MINIMALISTA
				</p>
				<h1 className="font-logo text-3xl text-foreground">Kash Flow</h1>
				<p className="font-client text-sm text-muted-foreground mt-3 leading-relaxed">
					Agenda rapida para registrar clientes e pagamentos do dia.
				</p>

				<button
					onClick={handleStart}
					className="w-full bg-foreground text-primary-foreground font-mono-ui text-sm px-6 py-2.5 rounded mt-6">
					ENTRAR
				</button>
			</div>
		</div>
	);
}
