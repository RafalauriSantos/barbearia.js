import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { requestPasswordReset, resetPassword } from "@/lib/api/auth.api";
import { BrandName } from "@/components/BrandName";
import { TurnstileWidget } from "@/components/TurnstileWidget";

export default function ForgotPasswordPage() {
	const [searchParams] = useSearchParams();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [turnstileToken, setTurnstileToken] = useState("dummy-turnstile-token");
	const [step, setStep] = useState("request");
	const [status, setStatus] = useState("idle");
	const [message, setMessage] = useState("");
	const [cooldown, setCooldown] = useState(0);

	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = setTimeout(() => {
			setCooldown((prev) => prev - 1);
		}, 1000);
		return () => clearTimeout(timer);
	}, [cooldown]);

	useEffect(() => {
		const initialEmail = searchParams.get("email");
		if (initialEmail) setEmail(initialEmail);
	}, [searchParams]);

	const handleRequestCode = async (event?: any) => {
		if (event) event.preventDefault();
		const cleanEmail = email.trim();
		if (!cleanEmail || status === "loading" || cooldown > 0) return;

		setStatus("loading");
		setMessage("");
		try {
			await requestPasswordReset({ email: cleanEmail, turnstileToken });
			setStep("reset");
			setStatus("idle");
			setMessage("Enviamos um codigo de 6 digitos para seu email.");
			setCooldown(60);
		} catch (error) {
			setStatus("error");
			if (error.status === 429 || error.retryAfter) {
				const waitSecs = error.retryAfter || 60;
				setCooldown(waitSecs);
				setMessage(`Muitas tentativas. Aguarde ${waitSecs}s antes de solicitar novamente.`);
			} else {
				setMessage(error.message || "Nao foi possivel enviar o codigo.");
			}
		}
	};

	const handlePasswordChange = (event) => {
		const nextPassword = event.target.value;
		setPassword(nextPassword);
		setMessage("");
		setStatus("idle");
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (step === "request") {
			await handleRequestCode();
			return;
		}

		const cleanEmail = email.trim();
		if (!cleanEmail || code.length !== 6 || password.length < 8) return;

		setStatus("loading");
		setMessage("");
		try {
			await resetPassword({
				email: cleanEmail,
				code,
				password,
			});
			setStatus("success");
			setMessage("Senha alterada com sucesso. Agora voce ja pode entrar.");
		} catch (error) {
			setStatus("error");
			setMessage(error.message || "Nao foi possivel redefinir a senha.");
		}
	};

	const isLoading = status === "loading";
	const isSuccess = status === "success";

	return (
		<div className="h-[var(--app-height)] overflow-y-auto bg-background-deep px-4 py-4">
			<div className="mx-auto flex min-h-[calc(var(--app-height)-32px)] w-full max-w-[480px] flex-col justify-center rounded-lg border border-border bg-background px-5 py-6 shadow-2xl shadow-black/30">
				<div className="mb-6 flex items-start justify-between gap-4">
					<div>
						<BrandName size="sm" className="text-paid" />
						<h1 className="mt-2 font-logo text-4xl leading-none text-foreground">
							Recuperar senha
						</h1>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3 text-left">
					{message && (
						<div
							className={`rounded-md border px-3 py-2 ${
								status === "error" ?
									"border-overdue/30 bg-overdue/10 text-overdue"
								:	"border-paid/30 bg-paid/10 text-foreground"
							}`}>
							<p className="font-mono-ui text-[10px] uppercase">
								{status === "error" ? "Erro" : "Informacao"}
							</p>
							<p className="mt-1 font-client text-sm leading-snug">{message}</p>
						</div>
					)}

					{step === "request" && (
						<div>
							<label
								htmlFor="password-reset-email"
								className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
								Email
							</label>
							<input
								id="password-reset-email"
								type="email"
								value={email}
								onChange={(event) => {
									setEmail(event.target.value);
									setMessage("");
									setStatus("idle");
								}}
								className="w-full rounded-md border border-border bg-background-deep px-3 py-3 text-sm text-foreground"
								autoComplete="email"
								disabled={isLoading || isSuccess}
								required
							/>
							<TurnstileWidget
								onSuccess={setTurnstileToken}
								onError={() => setTurnstileToken("")}
								onExpire={() => setTurnstileToken("")}
							/>
						</div>
					)}

					{step === "reset" && (
						<>
							<div>
								<label
									htmlFor="password-reset-code"
									className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
									Codigo de 6 digitos
								</label>
								<input
									id="password-reset-code"
									type="text"
									inputMode="numeric"
									value={code}
									onChange={(event) => {
										setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
										setMessage("");
										setStatus("idle");
									}}
									className="w-full rounded-md border border-border bg-background-deep px-3 py-3 text-sm tracking-[6px] text-foreground"
									disabled={isLoading || isSuccess}
									required
								/>
							</div>
							<div>
								<label
									htmlFor="password-reset-new-password"
									className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
									Nova senha
								</label>
								<input
									id="password-reset-new-password"
									type="password"
									value={password}
									onChange={handlePasswordChange}
									className="w-full rounded-md border border-border bg-background-deep px-3 py-3 text-sm text-foreground"
									autoComplete="new-password"
									disabled={isLoading || isSuccess}
									minLength={8}
									required
								/>
							</div>
						</>
					)}

					<button
						type="submit"
						disabled={isLoading || isSuccess}
						className="w-full rounded-md bg-foreground px-6 py-3 font-mono-ui text-sm text-primary-foreground transition-transform disabled:opacity-60 active:scale-[0.99]">
						{isLoading ?
							"Enviando..."
						: step === "request" ?
							"Enviar codigo"
						:	"Salvar nova senha"}
					</button>

					<Link
						to="/login"
						className="block w-full rounded-md border border-border px-6 py-3 text-center font-mono-ui text-xs text-foreground-faint transition-colors hover:text-foreground">
						Voltar para login
					</Link>
				</form>
			</div>
		</div>
	);
}
