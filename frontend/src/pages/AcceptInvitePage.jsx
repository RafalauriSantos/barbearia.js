import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getInvite } from "@/lib/api/auth.api";

export default function AcceptInvitePage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { acceptInvite, isAuthenticated, isLoading } = useAuth();
	const token = searchParams.get("token") || "";
	const [invite, setInvite] = useState(null);
	const [nome, setNome] = useState("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isInviteLoading, setIsInviteLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");

	const barberName = useMemo(
		() => invite?.barbeiro?.nome || "",
		[invite],
	);

	useEffect(() => {
		let mounted = true;

		async function loadInvite() {
			if (!token) {
				setErrorMessage("Convite invalido.");
				setIsInviteLoading(false);
				return;
			}

			try {
				const data = await getInvite(token);
				if (mounted) {
					setInvite(data);
					setNome(data.barbeiro?.nome || "");
				}
			} catch (error) {
				if (mounted) {
					setErrorMessage(error.message || "Convite invalido ou expirado.");
				}
			} finally {
				if (mounted) setIsInviteLoading(false);
			}
		}

		loadInvite();
		return () => {
			mounted = false;
		};
	}, [token]);

	if (!isLoading && isAuthenticated) {
		return <Navigate to="/app" replace />;
	}

	const handlePasswordChange = (event) => {
		const nextPassword = event.target.value;
		setPassword(nextPassword);
		setErrorMessage("");
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (isSubmitting) return;

		setIsSubmitting(true);
		setErrorMessage("");
		try {
			await acceptInvite({
				token,
				nome: nome.trim() || barberName,
				password: password || undefined,
			});
			navigate("/app", { replace: true });
		} catch (error) {
			setErrorMessage(error.message || "Nao foi possivel aceitar o convite.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-[var(--app-height)] bg-background-deep px-4 py-6">
			<div className="mx-auto flex min-h-[calc(var(--app-height)-48px)] w-full max-w-[480px] flex-col justify-center bg-background px-4">
				<div className="mb-6">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Convite de equipe
					</p>
					<h1 className="mt-2 font-logo text-4xl leading-none text-foreground">
						Kash Flow
					</h1>
				</div>

				<div className="rounded-lg border border-border bg-card p-4">
					{isInviteLoading ?
						<p className="font-mono-ui text-xs text-foreground-faint">
							Carregando convite
						</p>
					: errorMessage && !invite ?
						<div className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2">
							<p className="font-mono-ui text-[10px] text-overdue">Erro</p>
							<p className="mt-1 font-client text-sm text-overdue">
								{errorMessage}
							</p>
						</div>
					:	<form onSubmit={handleSubmit} className="space-y-3">
							<div className="rounded-md bg-background-deep px-3 py-3">
								<p className="font-mono-ui text-[10px] text-foreground-faint">
									Barbearia
								</p>
								<p className="mt-1 font-client text-sm text-foreground">
									{invite?.barbearia?.nome || "Barbearia"}
								</p>
								<p className="mt-1 font-mono-ui text-[10px] text-foreground-faint">
									Acesso para {barberName}
								</p>
							</div>

							{errorMessage && (
								<div className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2">
									<p className="font-mono-ui text-[10px] text-overdue">Erro</p>
									<p className="mt-1 font-client text-sm text-overdue">
										{errorMessage}
									</p>
								</div>
							)}

							<div>
								<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
									Nome
								</label>
								<input
									value={nome}
									onChange={(event) => setNome(event.target.value)}
									className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
									disabled={isSubmitting}
								/>
							</div>

							<div>
								<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
									Senha
								</label>
								<input
									type="password"
									value={password}
									onChange={handlePasswordChange}
									className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
									autoComplete="new-password"
									minLength={8}
									disabled={isSubmitting}
									placeholder="Obrigatoria para novo acesso"
								/>
							</div>

							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full rounded-md bg-foreground px-6 py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
								{isSubmitting ? "Ativando..." : "Ativar acesso"}
							</button>
						</form>
					}
				</div>
			</div>
		</div>
	);
}
