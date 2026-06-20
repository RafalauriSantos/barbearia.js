const nodemailer = require("nodemailer");
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

function hasSmtpConfig() {
	return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function hasBrevoConfig() {
	return Boolean(env.BREVO_API_KEY);
}

function getEmailProvider() {
	if (env.EMAIL_PROVIDER) {
		return env.EMAIL_PROVIDER;
	}

	return hasBrevoConfig() ? "brevo" : "smtp";
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

function getBrandName(shopName) {
	return String(shopName || env.EMAIL_BRAND_NAME || DEFAULT_BRAND_NAME).trim();
}

function getSenderAddress() {
	const sender = parseEmailAddress(env.EMAIL_FROM);
	const brandName = getBrandName();

	if (!sender.email) {
		return env.EMAIL_FROM;
	}

	return `${brandName} <${sender.email}>`;
}

function buildBrevoPayload(message) {
	const sender = parseEmailAddress(message.from || env.EMAIL_FROM);
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

function createTransporter() {
	if (!hasSmtpConfig()) {
		return nodemailer.createTransport({
			streamTransport: true,
			newline: "unix",
			buffer: true,
		});
	}

	return nodemailer.createTransport({
		host: env.SMTP_HOST,
		port: env.SMTP_PORT || 587,
		secure: env.SMTP_SECURE,
		connectionTimeout: env.EMAIL_TIMEOUT_MS,
		greetingTimeout: env.EMAIL_TIMEOUT_MS,
		socketTimeout: env.EMAIL_TIMEOUT_MS,
		auth: {
			user: env.SMTP_USER,
			pass: env.SMTP_PASS,
		},
	});
}

async function fetchWithTimeout(url, options) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), env.EMAIL_TIMEOUT_MS);

	try {
		return await fetch(url, { ...options, signal: controller.signal });
	} catch (error) {
		if (error.name === "AbortError") {
			throw new Error(
				`Brevo email API timed out after ${env.EMAIL_TIMEOUT_MS}ms`,
			);
		}

		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

async function sendViaBrevo(message) {
	if (typeof fetch !== "function") {
		throw new Error("Brevo email API requires Node.js 18+ with global fetch");
	}

	if (!hasBrevoConfig()) {
		throw new Error("BREVO_API_KEY is required when EMAIL_PROVIDER=brevo");
	}

	const payload = buildBrevoPayload(message);

	const response = await fetchWithTimeout(BREVO_SEND_EMAIL_URL, {
		method: "POST",
		headers: {
			accept: "application/json",
			"api-key": env.BREVO_API_KEY,
			"content-type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	const body = await response.text();
	let parsedBody = body;

	try {
		parsedBody = body ? JSON.parse(body) : {};
	} catch {
		// Keep Brevo's original response text when it is not JSON.
	}

	if (!response.ok) {
		throw new Error(
			`Brevo email API failed with status ${response.status}: ${body}`,
		);
	}

	return parsedBody;
}

async function sendEmail(message, debugLog) {
	if (getEmailProvider() === "brevo") {
		return sendViaBrevo(message);
	}

	const transporter = createTransporter();
	const info = await transporter.sendMail(message);

	if (!hasSmtpConfig() && debugLog) {
		console.log(debugLog.label, debugLog.value);
	}

	return info;
}

exports.sendCustomEmail = async function ({ to, subject, text }) {
	const message = {
		from: getSenderAddress(),
		to,
		subject,
		text,
		html: buildEmailTemplate({
			title: subject,
			body: text,
		}),
	};

	return sendEmail(message, { label: "[custom-email]", value: text });
};

exports.sendVerificationCodeEmail = async function ({ to, code, shopName }) {
	const brandName = getBrandName(shopName);
	const message = {
		from: getSenderAddress(),
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
	});
};

exports.sendPasswordResetCodeEmail = async function ({ to, code, shopName }) {
	const brandName = getBrandName(shopName);
	const message = {
		from: getSenderAddress(),
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
	});
};

exports.sendVerificationEmail = async function ({
	to,
	verificationUrl,
	shopName,
}) {
	const brandName = getBrandName(shopName);
	const message = {
		from: getSenderAddress(),
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
	});
};

exports.sendBarberInviteEmail = async function ({
	to,
	barberName,
	shopName,
	inviteUrl,
}) {
	const brandName = getBrandName(shopName);
	const message = {
		from: getSenderAddress(),
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

	return sendEmail(message, { label: "[barber-invite]", value: inviteUrl });
};

exports._private = {
	buildBrevoPayload,
	getBrandName,
	getSenderAddress,
	parseEmailAddress,
	parseRecipients,
};
