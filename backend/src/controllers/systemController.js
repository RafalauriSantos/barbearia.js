const SystemService = require("../services/systemService");
const EmailService = require("../services/emailService");
const { env } = require("../config/env");
const { AppError } = require("../lib/errors");

function notFound(reply) {
	return reply.code(404).send({ error: "Not found" });
}

exports.reset = async (request, reply) => {
	if (env.NODE_ENV === "production") {
		return notFound(reply);
	}

	await SystemService.resetData();
	return reply.code(204).send();
};

exports.sendTestEmail = async (request, reply) => {
	if (env.NODE_ENV === "production") {
		return notFound(reply);
	}

	const body = request.body || {};
	const to = String(body.to || "").trim();
	const subject = String(body.subject || "Teste de email").trim();
	const text = String(
		body.text || "Email transacional enviado pela API do Gestor Barbearia.",
	).trim();

	if (!to) {
		throw new AppError(
			400,
			"EMAIL_TO_REQUIRED",
			"Informe o destinatario em to.",
		);
	}

	await EmailService.sendCustomEmail({
		to,
		subject,
		text,
	});

	return reply.send({
		ok: true,
		provider: env.EMAIL_PROVIDER || (env.BREVO_API_KEY ? "brevo" : "smtp"),
	});
};
