const AuthService = require("../services/authService");
const ReceivablesService = require("../services/receivablesService");
const {
	validateReceivablesQuery,
	validateCreateReceivable,
	validateUpdateReceivable,
	validateReceiveReceivable,
} = require("../validators/receivables.schema");

async function getCurrentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function list(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const query = validateReceivablesQuery(request.query);
	return reply.send(await ReceivablesService.list(query, user));
}

export async function create(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateCreateReceivable(request.body);
	return reply.code(201).send(await ReceivablesService.create(payload, user));
}

export async function update(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateUpdateReceivable(request.body);
	return reply.send(await ReceivablesService.update(request.params.id, payload, user));
}

export async function receive(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateReceiveReceivable(request.body);
	return reply.send(await ReceivablesService.receive(request.params.id, payload, user));
}

export async function cancel(request: any, reply: any) {
	const user = await getCurrentUser(request);
	return reply.send(await ReceivablesService.cancel(request.params.id, user));
}

module.exports = {
	list,
	create,
	update,
	receive,
	cancel,
};
