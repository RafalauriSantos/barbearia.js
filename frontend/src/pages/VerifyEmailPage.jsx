import { Link } from "react-router-dom";

export default function VerifyEmailPage() {
	return (
		<div className="min-h-[var(--app-height)] bg-background-deep px-4 py-6">
			<div className="mx-auto flex min-h-[calc(var(--app-height)-48px)] w-full max-w-[480px] flex-col justify-center bg-background px-4">
				<div className="rounded-lg border border-border bg-card p-5 text-center">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Verificação de email
					</p>
					<h1 className="mt-2 font-logo text-4xl leading-none text-foreground">
						Gestor Barbearia
					</h1>
					<p className="mt-5 rounded-md border border-border bg-card px-3 py-3 font-client text-sm leading-relaxed text-foreground-faint">
						A confirmacao agora e feita por codigo de 6 digitos. Abra a tela de
						verificacao e informe seu email para reenviar o codigo.
					</p>
					<Link
						to="/verify-code"
						className="mt-4 block w-full rounded-md bg-foreground px-6 py-3 font-mono-ui text-sm text-primary-foreground">
						Ir para verificacao por codigo
					</Link>
					<Link
						to="/login"
						className="mt-2 block w-full rounded-md border border-border px-6 py-3 font-mono-ui text-xs text-foreground-faint">
						Ir para login
					</Link>
				</div>
			</div>
		</div>
	);
}
