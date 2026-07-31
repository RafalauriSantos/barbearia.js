import { AppError } from "../lib/errors";
const { env } = require("../config/env");

const DEFAULT_BRAND_NAME = "Agenddar";
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function buildEmailTemplate({ title, body, code, ctaUrl, ctaText }: { title: string; body: string; code?: string; ctaUrl?: string; ctaText?: string }): string {
	const codeHtml =
		code ?
			`
		<div style="margin:24px 0;text-align:center;">
			<span style="display:inline-block;padding:12px 24px;font-family:monospace;font-size:28px;font-weight:bold;letter-spacing:6px;color:#18181b;background-color:#f4f4f5;border-radius:8px;border:1px solid #e4e4e7;">
				${code}
			</span>
		</div>
	`
		:	"";

	const ctaHtml =
		ctaUrl && ctaText ?
			`
		<div style="margin:24px 0;text-align:center;">
			<a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;font-family:sans-serif;font-size:14px;font-weight:bold;color:#ffffff;background-color:#18181b;border-radius:6px;text-decoration:none;">
				${ctaText}
			</a>
		</div>
	`
		:	"";

	return `
		<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;color:#18181b;background-color:#ffffff;">
			<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4e4e7;border-radius:8px;padding:32px;">
				<tr>
					<td>
						<h1 style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#18181b;text-align:center;">
							${title}
						</h1>
						<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
							${body}
						</p>
						${codeHtml}
						${ctaHtml}
						<p style="margin:0;color:#8a8a8a;font-size:12px;line-height:1.6;">
							Se voce nao criou essa conta, ignore este email.
						</p>
					</td>
				</tr>
			</table>
		</div>
	`;
}

function getEnvValue(key: string, runtimeEnv?: any) {
	if (runtimeEnv && runtimeEnv[key] !== undefined) {
		return runtimeEnv[key];
	}
	return env[key];
}

function hasSmtpConfig(runtimeEnv?: any): boolean {
	return Boolean(
		getEnvValue("SMTP_HOST", runtimeEnv) &&
		getEnvValue("SMTP_USER", runtimeEnv) &&
		getEnvValue("SMTP_PASS", runtimeEnv)
	);
}

function hasBrevoConfig(runtimeEnv?: any): boolean {
	return Boolean(getEnvValue("BREVO_API_KEY", runtimeEnv));
}

function getEmailProvider(runtimeEnv?: any): string {
	const provider = getEnvValue("EMAIL_PROVIDER", runtimeEnv);
	if (provider) {
		return provider;
	}

	return hasBrevoConfig(runtimeEnv) ? "brevo" : "smtp";
}

function parseEmailAddress(value: any) {
	const rawValue = String(value || "").trim();
	const match = rawValue.match(/^(.*?)<([^>]+)>$/);

	if (!match) {
		return { email: rawValue };
	}

	const rawName = match[1].trim().replace(/^["']|["']$/g, "");
	return {
		name: rawName || undefined,
		email: match[2].trim(),
	};
}

function parseRecipients(value: any) {
	const values = Array.isArray(value) ? value : String(value || "").split(",");

	return values.map(parseEmailAddress).filter((recipient) => recipient.email);
}

function getBrandName(shopName?: string, runtimeEnv?: any): string {
	return String(shopName || getEnvValue("EMAIL_BRAND_NAME", runtimeEnv) || DEFAULT_BRAND_NAME).trim();
}

function getSenderAddress(runtimeEnv?: any): string {
	const sender = parseEmailAddress(getEnvValue("EMAIL_FROM", runtimeEnv));
	const brandName = getBrandName(undefined, runtimeEnv);

	if (!sender.email) {
		return getEnvValue("EMAIL_FROM", runtimeEnv);
	}

	return `${brandName} <${sender.email}>`;
}

function buildBrevoPayload(message: any, runtimeEnv?: any) {
	const sender = parseEmailAddress(message.from || getEnvValue("EMAIL_FROM", runtimeEnv));
	const recipients = parseRecipients(message.to);

	if (!sender.email) {
		throw new Error("EMAIL_FROM must include a sender email address");
	}

	if (!recipients.length) {
		throw new Error("Email recipient is required");
	}

	const payload: Record<string, any> = {
		sender,
		to: recipients,
		subject: message.subject,
	};

	if (message.html) {
		payload.htmlContent = message.html;
	} else if (message.text) {
		payload.textContent = message.text;
	} else {
		throw new Error("Email content is required");
	}

	return payload;
}

async function fetchWithTimeout(url: string, options: any, runtimeEnv?: any) {
	const controller = new AbortController();
	const timeoutMs = Number(getEnvValue("EMAIL_TIMEOUT_MS", runtimeEnv)) || 10000;
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		return response;
	} catch (error: any) {
		if (error.name === "AbortError") {
			throw new Error(`Email provider request timed out after ${timeoutMs}ms`);
		}
		throw error;
	} finally {
		clearTimeout(timer);
	}
}

async function sendViaBrevo(message: any, runtimeEnv?: any) {
	const apiKey = getEnvValue("BREVO_API_KEY", runtimeEnv);
	if (!apiKey) {
		throw new Error("BREVO_API_KEY environment variable is missing");
	}

	const payload = buildBrevoPayload(message, runtimeEnv);

	console.log(`[Brevo Email] Enviando e-mail via API da Brevo para: ${JSON.stringify(payload.to)}`);

	let response: any;
	try {
		response = await fetchWithTimeout(BREVO_API_URL, {
			method: "POST",
			headers: {
				"accept": "application/json",
				"api-key": apiKey,
				"content-type": "application/json",
			},
			body: JSON.stringify(payload),
		}, runtimeEnv);
	} catch (fetchError: any) {
		console.error("[Brevo Email] Erro de rede ou timeout no fetch:", fetchError.message || fetchError);
		throw fetchError;
	}

	const body = await response.text();
	console.log(`[Brevo Email] Resposta HTTP Status: ${response.status}`);

	if (!response.ok) {
		console.error(`[Brevo Email] Erro retornado pela API da Brevo: ${body}`);
		throw new Error(
			`Brevo email API failed with status ${response.status}: ${body}`,
		);
	}

	console.log(`[Brevo Email] E-mail enviado com sucesso. Resposta: ${body}`);

	let parsedBody = body;
	try {
		parsedBody = body ? JSON.parse(body) : {};
	} catch {
		// Keep Brevo's original response text when it is not JSON.
	}

	return parsedBody;
}

function obfuscateOtp(code: any): string {
	const str = String(code || "");
	if (str.length <= 2) return "**";
	return str[0] + "*".repeat(str.length - 2) + str[str.length - 1];
}

async function sendEmail(message: any, debugLog?: { label: string; value: any }, runtimeEnv?: any) {
	const provider = getEmailProvider(runtimeEnv);
	if (provider === "brevo") {
		return sendViaBrevo(message, runtimeEnv);
	}

	if (getEnvValue("NODE_ENV", runtimeEnv) === "production") {
		const errMessage = `Erro: Provedor de e-mail '${provider}' nao configurado ou invalido para producao. BREVO_API_KEY disponivel: ${hasBrevoConfig(runtimeEnv)}`;
		console.error(`[Email Service] ${errMessage}`);
		throw new Error(errMessage);
	}

	if (debugLog) {
		const isOtp = debugLog.label.includes("code");
		const loggedValue = isOtp ? obfuscateOtp(debugLog.value) : debugLog.value;
		console.log(debugLog.label, loggedValue);
	} else {
		console.log("[email-fallback-log] Envio de email:", message.subject, "Para:", message.to);
	}

	return { messageId: "workers-fallback-email-id", accepted: [message.to] };
}

export async function sendCustomEmail({ to, subject, text }: { to: string; subject: string; text: string }, runtimeEnv?: any) {
	const message = {
		from: getSenderAddress(runtimeEnv),
		to,
		subject,
		text,
	};
	return sendEmail(message, undefined, runtimeEnv);
}

export async function sendVerificationCodeEmail({
	to,
	code,
	shopName,
}: {
	to: string;
	code: string;
	shopName?: string;
}, runtimeEnv?: any) {
	const brandName = getBrandName(shopName, runtimeEnv);
	const message = {
		from: getSenderAddress(runtimeEnv),
		to,
		subject: `Codigo de confirmacao - ${brandName}`,
		html: buildEmailTemplate({
			title: "Confirme seu cadastro",
			body: `Use este codigo de 6 digitos para confirmar seu cadastro no ${brandName}:`,
			code,
		}),
	};

	return sendEmail(message, {
		label: "[verification-code]",
		value: code,
	}, runtimeEnv);
}

export async function sendPasswordResetCodeEmail({
	to,
	code,
	shopName,
}: {
	to: string;
	code: string;
	shopName?: string;
}, runtimeEnv?: any) {
	const brandName = getBrandName(shopName, runtimeEnv);
	const message = {
		from: getSenderAddress(runtimeEnv),
		to,
		subject: `Codigo para redefinir senha - ${brandName}`,
		html: buildEmailTemplate({
			title: "Redefina sua senha",
			body: `Use este codigo para redefinir sua senha no ${brandName}:`,
			code,
		}),
	};

	return sendEmail(message, {
		label: "[password-reset-code]",
		value: code,
	}, runtimeEnv);
}

export async function sendVerificationEmail({
	to,
	verificationUrl,
	shopName,
}: {
	to: string;
	verificationUrl: string;
	shopName?: string;
}, runtimeEnv?: any) {
	const brandName = getBrandName(shopName, runtimeEnv);
	const message = {
		from: getSenderAddress(runtimeEnv),
		to,
		subject: `Confirme seu cadastro no ${brandName}`,
		html: buildEmailTemplate({
			title: "Bem-vindo ao " + brandName,
			body: `Clique no botao abaixo para confirmar seu email e ativar sua conta no ${brandName}:`,
			ctaUrl: verificationUrl,
			ctaText: "Confirmar meu Email",
		}),
	};

	return sendEmail(message, undefined, runtimeEnv);
}

export async function sendBarberInviteEmail({
	to,
	barberName,
	shopName,
	inviteUrl,
}: {
	to: string;
	barberName?: string;
	shopName?: string;
	inviteUrl: string;
}, runtimeEnv?: any) {
	const brandName = getBrandName(shopName, runtimeEnv);
	const message = {
		from: getSenderAddress(runtimeEnv),
		to,
		subject: `Convite para acessar ${brandName}`,
		html: buildEmailTemplate({
			title: "Convite para a agenda",
			body: `Voce foi convidado para acessar a agenda como barbeiro${barberName ? ` (${barberName})` : ""}.<br/><br/>Se o botao nao abrir, copie este link:<br/><a href="${inviteUrl}">${inviteUrl}</a>`,
			ctaUrl: inviteUrl,
			ctaText: "Criar acesso",
		}),
	};

	return sendEmail(message, { label: "[barber-invite]", value: inviteUrl }, runtimeEnv);
}

module.exports = {
	sendCustomEmail,
	sendVerificationCodeEmail,
	sendPasswordResetCodeEmail,
	sendVerificationEmail,
	sendBarberInviteEmail,
};
export default module.exports;
