import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { requestPasswordReset, resetPassword } from "@/lib/api/auth.api";

export default function ForgotPasswordPage() {
	const [searchParams] = useSearchParams();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [step, setStep] = useState("request");
	const [status, setStatus] = useState("idle");
	const [message, setMessage] = useState("");

	useEffect(() => {
		const initialEmail = searchParams.get("email");
		if (initialEmail) setEmail(initialEmail);
	}, [searchParams]);

	const handleRequestCode = async (event) => {
		event.preventDefault();
		const cleanEmail = email.trim();
		if (!cleanEmail || status === "loading") return;

		setStatus("loading");
		setMessage("");
		try {
			await requestPasswordReset({ email: cleanEmail });
			setStep("reset");
			setStatus("idle");
			setMessage("Enviamos um codigo de 6 digitos para seu email.");
		} catch (error) {
			setStatus("error");
			setMessage(error.message || "Nao foi possivel enviar o codigo.");
		}
	};

	const handlePasswordChange = (event) => {
		const nextPassword = event.target.value;
		setPassword(nextPassword);
		setMessage("");
		setStatus("idle");
	};

	const handleResetPassword = async (event) => {
		event.preventDefault();
		const cleanEmail = email.trim();
		if (!cleanEmail || code.length !== 6 || status === "loading") return;

		setStatus("loading");
		setMessage("");
		try {
			await resetPassword({ email: cleanEmail, code, password });
			setStatus("success");
			setPassword("");
			setMessage("Senha redefinida. Agora voce ja pode entrar.");
		} catch (error) {
			setStatus("error");
			setMessage(error.message || "Nao foi possivel redefinir a senha.");
		}
	};

	const isLoading = status === "loading";
	const isSuccess = status === "success";

	return (
		<div className="min-h-[var(--app-height)] bg-background-deep px-4 py-6">
			<div className="mx-auto flex min-h-[calc(var(--app-height)-48px)] w-full max-w-[480px] flex-col justify-center bg-background px-4">
				<div className="rounded-lg border border-border bg-card p-5">
					<div className="text-center">
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
							Redefinir senha
						</p>
						<h1 className="mt-2 font-logo text-4xl leading-none text-foreground">
							Kash Flow
						</h1>
					</div>

					<form
						onSubmit={step === "request" ? handleRequestCode : handleResetPassword}
						className="mt-5 space-y-3 text-left">
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

						{message && (
							<p
								className={`rounded-md border px-3 py-3 font-client text-sm leading-relaxed ${
									status === "error" ?
										"border-overdue/30 bg-overdue/10 text-overdue"
									: status === "success" ?
										"border-paid/30 bg-paid/10 text-foreground"
									:	"border-border bg-background-deep text-foreground-faint"
								}`}>
								{message}
							</p>
						)}

						<button
							type="submit"
							disabled={isLoading || isSuccess}
							className="w-full rounded-md bg-foreground px-6 py-3 font-mono-ui text-sm text-primary-foreground transition-transform disabled:opacity-60 active:scale-[0.99]">
							{isLoading ?
								"Processando..."
							: step === "request" ?
								"Enviar codigo"
							:	"Redefinir senha"}
						</button>

						{step === "reset" && !isSuccess && (
							<button
								type="button"
								onClick={handleRequestCode}
								disabled={isLoading}
								className="w-full rounded-md border border-border px-6 py-3 font-mono-ui text-xs text-foreground-faint disabled:opacity-60">
								Reenviar codigo
							</button>
						)}
					</form>

					<Link
						to="/login"
						className="mt-4 block w-full rounded-md border border-border px-6 py-3 text-center font-mono-ui text-xs text-foreground-faint">
						Voltar para login
					</Link>
				</div>
			</div>
		</div>
	);
}
