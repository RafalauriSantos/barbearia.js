const nodemailer = require("nodemailer");
const { env } = require("../config/env");

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
				<a href="${cta.url}" style="display:inline-block;background:#00d37a;color:#0b0b0b;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.3px;padding:12px 18px;border-radius:8px;">
					${escapeHtml(cta.label)}
				</a>
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
		auth: {
			user: env.SMTP_USER,
			pass: env.SMTP_PASS,
		},
	});
}

exports.sendCustomEmail = async function ({ to, subject, text }) {
	const transporter = createTransporter();
	const message = {
		from: env.EMAIL_FROM,
		to,
		subject,
		text,
		html: buildEmailTemplate({
			title: subject,
			body: text,
		}),
	};

	const info = await transporter.sendMail(message);

	if (!hasSmtpConfig()) {
		console.log("[custom-email]", text);
	}

	return info;
};

exports.sendVerificationCodeEmail = async function ({ to, code, shopName }) {
	const transporter = createTransporter();
	const brandName = shopName || "Kash Flow";
	const message = {
		from: env.EMAIL_FROM,
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

	const info = await transporter.sendMail(message);

	if (!hasSmtpConfig()) {
		console.log("[email-verification-code]", code);
	}

	return info;
};

exports.sendPasswordResetCodeEmail = async function ({ to, code, shopName }) {
	const transporter = createTransporter();
	const brandName = shopName || "Kash Flow";
	const message = {
		from: env.EMAIL_FROM,
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

	const info = await transporter.sendMail(message);

	if (!hasSmtpConfig()) {
		console.log("[password-reset-code]", code);
	}

	return info;
};

exports.sendVerificationEmail = async function ({
	to,
	verificationUrl,
	shopName,
}) {
	const transporter = createTransporter();
	const brandName = shopName || "Kash Flow";
	const message = {
		from: env.EMAIL_FROM,
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

	const info = await transporter.sendMail(message);

	if (!hasSmtpConfig()) {
		console.log("[email-verification]", verificationUrl);
	}

	return info;
};

exports.sendBarberInviteEmail = async function ({
	to,
	barberName,
	shopName,
	inviteUrl,
}) {
	const transporter = createTransporter();
	const message = {
		from: env.EMAIL_FROM,
		to,
		subject: `Convite para acessar ${shopName || "Kash Flow"}`,
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

	const info = await transporter.sendMail(message);

	if (!hasSmtpConfig()) {
		console.log("[barber-invite]", inviteUrl);
	}

	return info;
};
