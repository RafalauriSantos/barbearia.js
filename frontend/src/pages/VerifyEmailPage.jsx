import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "@/lib/api/auth.api";

export default function VerifyEmailPage() {
	const [searchParams] = useSearchParams();
	const [status, setStatus] = useState("loading");
	const [message, setMessage] = useState("Confirmando seu email...");

	useEffect(() => {
		let mounted = true;
		const token = searchParams.get("token");

		async function confirmEmail() {
			if (!token) {
				setStatus("error");
				setMessage("Link de verificacao invalido.");
				return;
			}

			try {
				await verifyEmail(token);
				if (mounted) {
					setStatus("success");
					setMessage("Email confirmado. Agora voce ja pode entrar.");
				}
			} catch (error) {
				if (mounted) {
					setStatus("error");
					setMessage(error.message || "Nao foi possivel confirmar o email.");
				}
			}
		}

		confirmEmail();

		return () => {
			mounted = false;
		};
	}, [searchParams]);

	return (
		<div className="min-h-[100dvh] bg-background-deep px-4 py-6">
			<div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-[480px] flex-col justify-center bg-background px-4">
				<div className="rounded-lg border border-border bg-card p-5 text-center">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Verificação de email
					</p>
					<h1 className="mt-2 font-logo text-4xl leading-none text-foreground">
						Kash Flow
					</h1>
					<p
						className={`mt-5 rounded-md border px-3 py-3 font-client text-sm leading-relaxed ${
							status === "error" ?
								"border-overdue/30 bg-overdue/10 text-overdue"
							:	"border-paid/30 bg-paid/10 text-foreground"
						}`}>
						{message}
					</p>
					<Link
						to="/login"
						className="mt-5 block w-full rounded-md bg-foreground px-6 py-3 font-mono-ui text-sm text-primary-foreground">
						Ir para login
					</Link>
				</div>
			</div>
		</div>
	);
}
