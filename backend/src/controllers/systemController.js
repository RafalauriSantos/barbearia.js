const SystemService = require("../services/systemService");

exports.reset = async (request, reply) => {
	await SystemService.resetData();
	return reply.code(204).send();
};
