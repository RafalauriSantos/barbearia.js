const SystemService = require("../services/systemService");
const EmailService = require("../services/emailService");
const { env } = require("../config/env");

exports.reset = async (request, reply) => {
	await SystemService.resetData();
	return reply.code(204).send();
};

exports.sendTestEmail = async (request, reply) => {
	if (env.NODE_ENV === "production") {
		return reply.code(403).send({ error: "Not available in production" });
	}

	await EmailService.sendCustomEmail({
		to: "orafaellauri@gmail.com",
		subject: "Teste de email",
		text: "atençao guarnieri, esse email funciona ok ?",
	});

	return reply.send({ ok: true });
};
