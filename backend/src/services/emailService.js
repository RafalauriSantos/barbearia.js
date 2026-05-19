const nodemailer = require("nodemailer");
const { env } = require("../config/env");

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

exports.sendVerificationEmail = async function ({ to, verificationUrl }) {
	const transporter = createTransporter();
	const message = {
		from: env.EMAIL_FROM,
		to,
		subject: "Confirme seu acesso ao Kash Flow",
		text: [
			"Ola.",
			"",
			"Confirme seu email para liberar o acesso ao Kash Flow:",
			verificationUrl,
			"",
			"Se voce nao criou essa conta, ignore este email.",
		].join("\n"),
		html: `
			<p>Ola.</p>
			<p>Confirme seu email para liberar o acesso ao Kash Flow:</p>
			<p><a href="${verificationUrl}">Confirmar email</a></p>
			<p>Se voce nao criou essa conta, ignore este email.</p>
		`,
	};

	const info = await transporter.sendMail(message);

	if (!hasSmtpConfig()) {
		console.log("[email-verification]", verificationUrl);
	}

	return info;
};

exports.sendBarberInviteEmail = async function ({ to, barberName, shopName, inviteUrl }) {
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
		html: `
			<p>Ola.</p>
			<p>Voce foi convidado para acessar a agenda como barbeiro${barberName ? ` (${barberName})` : ""}.</p>
			<p><a href="${inviteUrl}">Criar acesso</a></p>
			<p>Se voce nao esperava este convite, ignore este email.</p>
		`,
	};

	const info = await transporter.sendMail(message);

	if (!hasSmtpConfig()) {
		console.log("[barber-invite]", inviteUrl);
	}

	return info;
};
