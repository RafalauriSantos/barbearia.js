const { env } = require("../config/env");

const BREVO_SEND_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_BRAND_NAME = "Marque’s Barbearia";

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function buildEmailTemplate({ title, body, cta, code }) {
	const safeTitle = escapeHtml(title);
	const safeBody = escapeHtml(body);
	const ctaHtml =
		cta ?
			`
			<p style="margin:0 0 18px;">
				<a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#00d37a;color:#0b0b0b;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.3px;padding:12px 18px;border-radius:8px;">
					${escapeHtml(cta.label)}
				</a>
			</p>
			<p style="margin:0 0 18px;color:#8a8a8a;font-size:12px;line-height:1.6;word-break:break-all;">
				Se o botao nao abrir, copie este link:<br />
				<a href="${escapeHtml(cta.url)}" style="color:#5dcaa5;">${escapeHtml(cta.url)}</a>
			</p>
		`
		:	"";
	const codeHtml =
		code ?
			`
			<div style="margin:0 0 18px;border:1px solid #2a2a2a;border-radius:8px;background:#0f0f0f;padding:12px;text-align:center;">
				<span style="font-size:22px;letter-spacing:6px;color:#ffffff;font-weight:700;">${escapeHtml(code)}</span>
			</div>
		`
		:	"";

	return `
		<div style="background:#0b0b0b;padding:24px 16px;font-family:Arial, sans-serif;">
			<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#111;border:1px solid #2a2a2a;border-radius:12px;">
				<tr>
					<td style="padding:24px;">
						<p style="margin:0 0 12px;color:#e5e5e5;font-size:14px;">Ola,</p>
						<h1 style="margin:0 0 8px;color:#ffffff;font-size:20px;line-height:1.2;">${safeTitle}</h1>
						<p style="margin:0 0 16px;color:#b5b5b5;font-size:14px;line-height:1.6;">
							${safeBody}
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

function getEnvValue(key, runtimeEnv) {
	if (runtimeEnv && runtimeEnv[key] !== undefined) {
		return runtimeEnv[key];
	}
	return env[key];
}

function hasSmtpConfig(runtimeEnv) {
	return Boolean(
		getEnvValue("SMTP_HOST", runtimeEnv) &&
		getEnvValue("SMTP_USER", runtimeEnv) &&
		getEnvValue("SMTP_PASS", runtimeEnv)
	);
}

function hasBrevoConfig(runtimeEnv) {
	return Boolean(getEnvValue("BREVO_API_KEY", runtimeEnv));
}

function getEmailProvider(runtimeEnv) {
	const provider = getEnvValue("EMAIL_PROVIDER", runtimeEnv);
	if (provider) {
		return provider;
	}

	return hasBrevoConfig(runtimeEnv) ? "brevo" : "smtp";
}

function parseEmailAddress(value) {
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

function parseRecipients(value) {
	const values = Array.isArray(value) ? value : String(value || "").split(",");

	return values.map(parseEmailAddress).filter((recipient) => recipient.email);
}

function getBrandName(shopName, runtimeEnv) {
	return String(shopName || getEnvValue("EMAIL_BRAND_NAME", runtimeEnv) || DEFAULT_BRAND_NAME).trim();
}

function getSenderAddress(runtimeEnv) {
	const sender = parseEmailAddress(getEnvValue("EMAIL_FROM", runtimeEnv));
	const brandName = getBrandName(undefined, runtimeEnv);

	if (!sender.email) {
		return getEnvValue("EMAIL_FROM", runtimeEnv);
	}

	return `${brandName} <${sender.email}>`;
}

function buildBrevoPayload(message, runtimeEnv) {
	const sender = parseEmailAddress(message.from || getEnvValue("EMAIL_FROM", runtimeEnv));
	const recipients = parseRecipients(message.to);

	if (!sender.email) {
		throw new Error("EMAIL_FROM must include a sender email address");
	}

	if (!recipients.length) {
		throw new Error("Email recipient is required");
	}

	const payload = {
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

// Nodemailer SMTP transport removed for Cloudflare Workers compatibility

async function fetchWithTimeout(url, options, runtimeEnv) {
	const controller = new AbortController();
	const timeoutMs = Number(getEnvValue("EMAIL_TIMEOUT_MS", runtimeEnv)) || 10000;
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} catch (error) {
		if (error.name === "AbortError") {
			throw new Error(
				`Brevo email API timed out after ${timeoutMs}ms`,
			);
		}

		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

async function sendViaBrevo(message, runtimeEnv) {
	if (typeof fetch !== "function") {
		throw new Error("Brevo email API requires Node.js 18+ with global fetch");
	}

	if (!hasBrevoConfig(runtimeEnv)) {
		throw new Error("BREVO_API_KEY is required when EMAIL_PROVIDER=brevo");
	}

	const payload = buildBrevoPayload(message, runtimeEnv);
	const apiKey = getEnvValue("BREVO_API_KEY", runtimeEnv);

	console.log(`[Brevo Email] Iniciando envio para: ${JSON.stringify(payload.to.map(r => r.email))} - Assunto: "${payload.subject}"`);

	let response;
	try {
		response = await fetchWithTimeout(BREVO_SEND_EMAIL_URL, {
			method: "POST",
			headers: {
				accept: "application/json",
				"api-key": apiKey,
				"content-type": "application/json",
			},
			body: JSON.stringify(payload),
		}, runtimeEnv);
	} catch (fetchError) {
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

function obfuscateOtp(code) {
	const str = String(code || "");
	if (str.length <= 2) return "**";
	return str[0] + "*".repeat(str.length - 2) + str[str.length - 1];
}

async function sendEmail(message, debugLog, runtimeEnv) {
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

exports.sendCustomEmail = async function ({ to, subject, text }, runtimeEnv) {
	const message = {
		from: getSenderAddress(runtimeEnv),
		to,
		subject,
		text,
		html: buildEmailTemplate({
			title: subject,
			body: text,
		}),
	};

	return sendEmail(message, { label: "[custom-email]", value: text }, runtimeEnv);
};

exports.sendVerificationCodeEmail = async function ({ to, code, shopName }, runtimeEnv) {
	const brandName = getBrandName(shopName, runtimeEnv);
	const message = {
		from: getSenderAddress(runtimeEnv),
		to,
		subject: `Codigo de confirmacao - ${brandName}`,
		text: [
			"Ola.",
			"",
			`Use este codigo para confirmar seu email no ${brandName}:`,
			code,
			"",
			"Se voce nao criou essa conta, ignore este email.",
		].join("\n"),
		html: buildEmailTemplate({
			title: "Confirme seu email",
			body: `Use este codigo para confirmar seu email no ${brandName}:`,
			code,
		}),
	};

	return sendEmail(message, {
		label: "[email-verification-code]",
		value: code,
	}, runtimeEnv);
};

exports.sendPasswordResetCodeEmail = async function ({ to, code, shopName }, runtimeEnv) {
	const brandName = getBrandName(shopName, runtimeEnv);
	const message = {
		from: getSenderAddress(runtimeEnv),
		to,
		subject: `Codigo para redefinir senha - ${brandName}`,
		text: [
			"Ola.",
			"",
			`Use este codigo para redefinir sua senha no ${brandName}:`,
			code,
			"",
			"Se voce nao pediu essa redefinicao, ignore este email.",
		].join("\n"),
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
};

exports.sendVerificationEmail = async function ({
	to,
	verificationUrl,
	shopName,
}, runtimeEnv) {
	const brandName = getBrandName(shopName, runtimeEnv);
	const message = {
		from: getSenderAddress(runtimeEnv),
		to,
		subject: `Confirme seu acesso ao ${brandName}`,
		text: [
			"Ola.",
			"",
			`Confirme seu email para liberar o acesso ao ${brandName}:`,
			verificationUrl,
			"",
			"Se voce nao criou essa conta, ignore este email.",
		].join("\n"),
		html: buildEmailTemplate({
			title: "Confirme seu email",
			body: `Clique no botao abaixo para liberar o acesso ao ${brandName}.`,
			cta: { label: "Confirmar email", url: verificationUrl },
		}),
	};

	return sendEmail(message, {
		label: "[email-verification]",
		value: verificationUrl,
	}, runtimeEnv);
};

exports.sendBarberInviteEmail = async function ({
	to,
	barberName,
	shopName,
	inviteUrl,
}, runtimeEnv) {
	const brandName = getBrandName(shopName, runtimeEnv);
	const message = {
		from: getSenderAddress(runtimeEnv),
		to,
		subject: `Convite para acessar ${brandName}`,
		text: [
			"Ola.",
			"",
			`Voce foi convidado para acessar a agenda como barbeiro${barberName ? ` (${barberName})` : ""}.`,
			"Use o link abaixo para criar seu acesso:",
			inviteUrl,
			"",
			"Se voce nao esperava este convite, ignore este email.",
		].join("\n"),
		html: buildEmailTemplate({
			title: "Convite para a agenda",
			body: `Voce foi convidado para acessar a agenda como barbeiro${barberName ? ` (${barberName})` : ""}.`,
			cta: { label: "Criar acesso", url: inviteUrl },
		}),
	};

	return sendEmail(message, { label: "[barber-invite]", value: inviteUrl }, runtimeEnv);
};

exports._private = {
	buildBrevoPayload,
	getBrandName,
	getSenderAddress,
	parseEmailAddress,
	parseRecipients,
};
