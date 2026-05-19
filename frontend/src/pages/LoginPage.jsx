import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
	const { isAuthenticated, isLoading, login, signup } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [mode, setMode] = useState("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const from = location.state?.from?.pathname || "/app";

	if (!isLoading && isAuthenticated) {
		return <Navigate to={from} replace />;
	}

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (isSubmitting) return;

		const cleanEmail = email.trim();
		if (mode === "signup" && password !== confirmPassword) {
			setErrorMessage("As senhas precisam ser iguais.");
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");
		setSuccessMessage("");
		try {
			if (mode === "signup") {
				const result = await signup({ email: cleanEmail, password });
				setMode("login");
				setPassword("");
				setConfirmPassword("");
				setSuccessMessage(
					result.verificationUrl ?
						`Conta criada. Confirme o email pelo link enviado. Em dev: ${result.verificationUrl}`
					:	"Conta criada. Confirme seu email pelo link enviado antes de entrar.",
				);
				return;
			} else {
				await login({ email: cleanEmail, password });
			}
			navigate(from, { replace: true });
		} catch (error) {
			setErrorMessage(
				error.message ||
					(mode === "signup" ?
						"Nao foi possivel criar a conta."
					:	"Nao foi possivel entrar."),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const isSignup = mode === "signup";

	return (
		<div className="min-h-[100dvh] bg-background-deep px-4 py-6">
			<div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-[480px] flex-col justify-center bg-background px-4">
				<div className="mb-6">
					<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Barbearia financeira
					</p>
					<h1 className="mt-2 font-logo text-4xl leading-none text-foreground">
						Kash Flow
					</h1>
					<p className="mt-3 max-w-xs font-client text-sm leading-relaxed text-foreground-faint">
						Agenda, caixa e equipe em um painel compacto para o dia a dia.
					</p>
				</div>

				<div className="rounded-lg border border-border bg-card p-4">
					<div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background-deep p-1">
						<button
							type="button"
							onClick={() => {
								setMode("login");
								setErrorMessage("");
								setSuccessMessage("");
							}}
							className={`rounded-md px-3 py-2 font-mono-ui text-[10px] ${
								!isSignup ?
									"bg-secondary text-foreground"
								:	"text-foreground-faint"
							}`}>
							Entrar
						</button>
						<button
							type="button"
							onClick={() => {
								setMode("signup");
								setErrorMessage("");
								setSuccessMessage("");
							}}
							className={`rounded-md px-3 py-2 font-mono-ui text-[10px] ${
								isSignup ?
									"bg-secondary text-foreground"
								:	"text-foreground-faint"
							}`}>
							Criar acesso
						</button>
					</div>

					<form onSubmit={handleSubmit} className="mt-5 space-y-3 text-left">
						{errorMessage && (
							<div className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2">
								<p className="font-mono-ui text-[10px] text-overdue">Erro</p>
								<p className="mt-1 font-client text-sm text-overdue">
									{errorMessage}
								</p>
							</div>
						)}

						{successMessage && (
							<div className="rounded-md border border-paid/30 bg-paid/10 px-3 py-2">
								<p className="font-mono-ui text-[10px] text-paid">Sucesso</p>
								<p className="mt-1 break-words font-client text-sm text-foreground">
									{successMessage}
								</p>
							</div>
						)}

						<div>
							<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
								Email
							</label>
							<input
								type="email"
								value={email}
								onChange={(event) => {
									setEmail(event.target.value);
									setErrorMessage("");
									setSuccessMessage("");
								}}
								className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
								autoComplete="email"
								disabled={isSubmitting || isLoading}
								required
							/>
						</div>

						<div>
							<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
								Senha
							</label>
							<input
								type="password"
								value={password}
								onChange={(event) => {
									setPassword(event.target.value);
									setErrorMessage("");
									setSuccessMessage("");
								}}
								className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
								autoComplete={isSignup ? "new-password" : "current-password"}
								disabled={isSubmitting || isLoading}
								minLength={isSignup ? 8 : 1}
								required
							/>
						</div>

						{isSignup && (
							<div>
								<label className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
									Confirmar senha
								</label>
								<input
									type="password"
									value={confirmPassword}
									onChange={(event) => {
										setConfirmPassword(event.target.value);
										setErrorMessage("");
										setSuccessMessage("");
									}}
									className="w-full rounded-md border border-border bg-secondary px-3 py-3 text-sm text-foreground"
									autoComplete="new-password"
									disabled={isSubmitting || isLoading}
									minLength={8}
									required
								/>
							</div>
						)}

						<button
							type="submit"
							disabled={isSubmitting || isLoading}
							className="w-full rounded-md bg-foreground px-6 py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
							{isSubmitting || isLoading ?
								isSignup ?
									"Criando..."
								:	"Entrando..."
							: isSignup ?
								"Criar conta"
							:	"Entrar"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
