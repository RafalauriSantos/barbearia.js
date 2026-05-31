import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { resendEmailCode } from "@/lib/api/auth.api";

const PENDING_VERIFICATION_EMAIL_KEY = "kash_flow_pending_verification_email";

function getPendingEmail() {
	if (typeof window === "undefined") return "";
	return window.sessionStorage?.getItem(PENDING_VERIFICATION_EMAIL_KEY) || "";
}

function setPendingEmail(email) {
	if (typeof window === "undefined" || !email) return;
	window.sessionStorage?.setItem(PENDING_VERIFICATION_EMAIL_KEY, email);
}

function clearPendingEmail() {
	if (typeof window === "undefined") return;
	window.sessionStorage?.removeItem(PENDING_VERIFICATION_EMAIL_KEY);
}

export default function VerifyCodePage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { verifyEmailCode } = useAuth();
	const [email, setEmail] = useState(() => getPendingEmail());
	const [code, setCode] = useState("");
	const [status, setStatus] = useState("idle");
	const [message, setMessage] = useState("");
	const [isResending, setIsResending] = useState(false);

	useEffect(() => {
		const initialEmail = searchParams.get("email");
		if (!initialEmail) return;

		const cleanEmail = initialEmail.trim();
		setPendingEmail(cleanEmail);
		setEmail(cleanEmail);
		navigate("/verify-code", { replace: true });
	}, [navigate, searchParams]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		if (!email || code.length !== 6) return;

		setStatus("loading");
		setMessage("");
		try {
			const result = await verifyEmailCode({ email: email.trim(), code });
			setStatus("success");
			clearPendingEmail();
			if (result?.accessToken) {
				navigate("/app", { replace: true });
				return;
			}
			setMessage("Conta ja confirmada. Entre com seu email e senha.");
		} catch (error) {
			setStatus("error");
			setMessage(error.message || "Nao foi possivel confirmar a conta.");
		}
	};

	const handleResend = async () => {
		if (!email || isResending) return;
		setIsResending(true);
		setMessage("");
		try {
			const result = await resendEmailCode({ email: email.trim() });
			if (result?.alreadyVerified) {
				setStatus("success");
				clearPendingEmail();
				setMessage("Conta ja confirmada. Voce pode entrar.");
			} else {
				setStatus("idle");
				setMessage("Reenviamos um novo codigo.");
			}
		} catch (error) {
			setStatus("error");
			setMessage(error.message || "Nao foi possivel reenviar o codigo.");
		} finally {
			setIsResending(false);
		}
	};

	return (
		<div className="min-h-[100dvh] bg-background-deep px-4 py-6">
			<div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-[480px] flex-col justify-center bg-background px-4">
					<div className="rounded-lg border border-border bg-card p-5 text-center">
						<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
						Verificacao da conta
					</p>
					<h1 className="mt-2 font-logo text-4xl leading-none text-foreground">
						Kash Flow
					</h1>

					<form onSubmit={handleSubmit} className="mt-5 space-y-3 text-left">
						<div>
							<label
								htmlFor="verification-code"
								className="mb-1 block font-mono-ui text-[10px] text-foreground-faint">
								Codigo de 6 digitos
							</label>
							<input
								id="verification-code"
								type="text"
								inputMode="numeric"
								value={code}
								onChange={(event) =>
									setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
								}
								className="w-full rounded-md border border-border bg-background-deep px-3 py-3 text-sm tracking-[6px] text-foreground"
								disabled={!email}
								required
							/>
						</div>

						{!email && (
							<p className="rounded-md border border-overdue/30 bg-overdue/10 px-3 py-3 font-client text-sm leading-relaxed text-overdue">
								Nao encontramos uma verificacao em andamento. Volte para criar
								a conta novamente.
							</p>
						)}

						{message && (
							<p
								className={`rounded-md border px-3 py-3 font-client text-sm leading-relaxed ${
									status === "error" ?
										"border-overdue/30 bg-overdue/10 text-overdue"
									: status === "success" ?
										"border-paid/30 bg-paid/10 text-foreground"
									:	"border-border bg-card text-foreground-faint"
								}`}>
								{message}
							</p>
						)}

						<button
							type="submit"
							disabled={!email || status === "loading"}
							className="w-full rounded-md bg-foreground px-6 py-3 font-mono-ui text-sm text-primary-foreground disabled:opacity-60">
							{status === "loading" ? "Confirmando..." : "Confirmar codigo"}
						</button>

						<button
							type="button"
							onClick={handleResend}
							disabled={!email || isResending}
							className="w-full rounded-md border border-border px-6 py-3 font-mono-ui text-xs text-foreground-faint disabled:opacity-60">
							{isResending ? "Reenviando..." : "Reenviar codigo"}
						</button>
					</form>

					<Link
						to="/login"
						className="mt-4 block w-full rounded-md border border-border px-6 py-3 text-center font-mono-ui text-xs text-foreground-faint">
						Ir para login
					</Link>
				</div>
			</div>
		</div>
	);
}
