import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { resendEmailCode } from "@/lib/api/auth.api";
import { ThemeToggle } from "@/components/ThemeToggle";

const SIGNUP_SUCCESS_MESSAGE =
	"Conta criada. Enviamos um codigo de 6 digitos para seu email.";
const PENDING_VERIFICATION_EMAIL_KEY = "kash_flow_pending_verification_email";

export default function LoginPage() {
	const { isAuthenticated, isLoading, login, signup } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [mode, setMode] = useState("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isResending, setIsResending] = useState(false);
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
				await signup({ email: cleanEmail, password });
				window.sessionStorage?.setItem(
					PENDING_VERIFICATION_EMAIL_KEY,
					cleanEmail,
				);
				setMode("login");
				setPassword("");
				setConfirmPassword("");
				setSuccessMessage(SIGNUP_SUCCESS_MESSAGE);
				navigate("/verify-code");
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

	const handleResendCode = async () => {
		const cleanEmail = email.trim();
		if (!cleanEmail || isResending) {
			setErrorMessage("Informe o email para reenviar o codigo.");
			return;
		}

		setIsResending(true);
		setErrorMessage("");
		setSuccessMessage("");
		try {
			await resendEmailCode({ email: cleanEmail });
			setSuccessMessage("Reenviamos um novo codigo para seu email.");
		} catch (error) {
			setErrorMessage(error.message || "Nao foi possivel reenviar o codigo.");
		} finally {
			setIsResending(false);
		}
	};

	const isSignup = mode === "signup";
	const forgotPasswordPath =
		email.trim() ?
			`/forgot-password?email=${encodeURIComponent(email.trim())}`
		:	"/forgot-password";

	return (
		<div className="min-h-[100dvh] bg-background-deep px-4 py-4">
			<div className="mx-auto flex min-h-[calc(100dvh-32px)] w-full max-w-[480px] flex-col justify-center rounded-lg border border-border bg-background px-5 py-6 shadow-2xl shadow-black/30">
				<div className="mb-6 flex items-start justify-between gap-4">
					<div>
						<p className="font-mono-ui text-[10px] uppercase text-paid">
							Kash Flow
						</p>
						<h1 className="mt-2 font-logo text-4xl leading-none text-foreground">
							Acesso da barbearia
						</h1>
						<p className="mt-3 max-w-xs font-client text-sm leading-relaxed text-foreground-faint">
							Entre para abrir a agenda do dia, registrar pagamentos e
							acompanhar a equipe.
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<ThemeToggle />
						<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-paid/40 bg-paid/10 font-value text-xl text-paid">
							K
						</span>
					</div>
				</div>

				<div className="rounded-lg border border-border bg-card p-3">
					<div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-background-deep p-1">
						<button
							type="button"
							onClick={() => {
								setMode("login");
								setErrorMessage("");
								setSuccessMessage("");
							}}
							className={`rounded-md px-3 py-2 font-mono-ui text-[10px] ${
								!isSignup ?
									"bg-foreground text-primary-foreground"
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
									"bg-foreground text-primary-foreground"
								:	"text-foreground-faint"
							}`}>
							Criar acesso
						</button>
					</div>

					<form onSubmit={handleSubmit} className="mt-4 space-y-3 text-left">
						{errorMessage && (
							<div className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-2">
								<p className="font-mono-ui text-[10px] uppercase text-overdue">
									Erro
								</p>
								<p className="mt-1 font-client text-sm text-overdue">
									{errorMessage}
								</p>
							</div>
						)}

						{successMessage && (
							<div
								role="status"
								aria-live="polite"
								className="rounded-md border border-paid/30 bg-paid/10 px-3 py-2">
								<p className="font-mono-ui text-[10px] uppercase text-paid">
									Sucesso
								</p>
								<p className="mt-1 max-w-[34rem] font-client text-sm leading-snug text-foreground">
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
								className="w-full rounded-md border border-border bg-background-deep px-3 py-3 text-sm text-foreground"
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
								className="w-full rounded-md border border-border bg-background-deep px-3 py-3 text-sm text-foreground"
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
									className="w-full rounded-md border border-border bg-background-deep px-3 py-3 text-sm text-foreground"
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
							className="w-full rounded-md bg-foreground px-6 py-3 font-mono-ui text-sm text-primary-foreground transition-transform disabled:opacity-60 active:scale-[0.99]">
							{isSubmitting || isLoading ?
								isSignup ?
									"Criando..."
								:	"Entrando..."
							: isSignup ?
								"Criar conta"
							:	"Entrar"}
						</button>

						<Link
							to={forgotPasswordPath}
							className="block w-full rounded-md border border-border px-6 py-3 text-center font-mono-ui text-xs text-foreground-faint transition-colors hover:text-foreground">
							Esqueci minha senha
						</Link>

						{isSignup && (
							<button
								type="button"
								onClick={handleResendCode}
								disabled={isResending || isSubmitting || isLoading}
								className="w-full rounded-md border border-border px-6 py-3 font-mono-ui text-xs text-foreground-faint disabled:opacity-60">
								{isResending ? "Reenviando..." : "Reenviar codigo"}
							</button>
						)}
					</form>
				</div>
			</div>
		</div>
	);
}
