const AuthService = require("../services/authService");
const ReceivablesService = require("../services/receivablesService");
const {
	validateReceivablesQuery,
	validateCreateReceivable,
	validateUpdateReceivable,
	validateReceiveReceivable,
} = require("../validators/receivables.schema");

async function getCurrentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.list = async (request, reply) => {
	const user = await getCurrentUser(request);
	const query = validateReceivablesQuery(request.query);
	return reply.send(await ReceivablesService.list(query, user));
};

exports.create = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateCreateReceivable(request.body);
	return reply.code(201).send(await ReceivablesService.create(payload, user));
};

exports.update = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateUpdateReceivable(request.body);
	return reply.send(await ReceivablesService.update(request.params.id, payload, user));
};

exports.receive = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateReceiveReceivable(request.body);
	return reply.send(await ReceivablesService.receive(request.params.id, payload, user));
};

exports.cancel = async (request, reply) => {
	const user = await getCurrentUser(request);
	return reply.send(await ReceivablesService.cancel(request.params.id, user));
};
