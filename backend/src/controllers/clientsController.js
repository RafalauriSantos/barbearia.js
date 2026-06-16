const AuthService = require("../services/authService");
const ClientsService = require("../services/clientsService");
const {
	validateCreateFixedClient,
	validateUpdateFixedClient,
	validateCreateClientCut,
	validateUpdateClientCut,
	validateWaitlistEntry,
	validateUpdateWaitlistEntry,
} = require("../validators/clients.schema");

async function getCurrentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.listFixed = async (request, reply) => {
	const user = await getCurrentUser(request);
	const clients = await ClientsService.listFixedClients(user);
	return reply.send(clients);
};

exports.createFixed = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateCreateFixedClient(request.body);
	const created = await ClientsService.createFixedClient(payload, user);
	return reply.code(201).send(created);
};

exports.updateFixed = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateUpdateFixedClient(request.body);
	const updated = await ClientsService.updateFixedClient(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
};

exports.removeFixed = async (request, reply) => {
	const user = await getCurrentUser(request);
	await ClientsService.deleteFixedClient(request.params.id, user);
	return reply.code(204).send();
};

exports.createCut = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateCreateClientCut(request.body);
	const client = await ClientsService.createClientCut(
		request.params.id,
		payload,
		user,
	);
	return reply.code(201).send(client);
};

exports.updateCut = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateUpdateClientCut(request.body);
	const client = await ClientsService.updateClientCut(
		request.params.id,
		request.params.cutId,
		payload,
		user,
	);
	return reply.send(client);
};

exports.removeCut = async (request, reply) => {
	const user = await getCurrentUser(request);
	const client = await ClientsService.deleteClientCut(
		request.params.id,
		request.params.cutId,
		user,
	);
	return reply.send(client);
};

exports.listWaitlist = async (request, reply) => {
	const user = await getCurrentUser(request);
	const entries = await ClientsService.listWaitlist(user);
	return reply.send(entries);
};

exports.createWaitlist = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateWaitlistEntry(request.body);
	const created = await ClientsService.createWaitlistEntry(payload, user);
	return reply.code(201).send(created);
};

exports.updateWaitlist = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateUpdateWaitlistEntry(request.body);
	const updated = await ClientsService.updateWaitlistEntry(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
};

exports.removeWaitlist = async (request, reply) => {
	const user = await getCurrentUser(request);
	await ClientsService.deleteWaitlistEntry(request.params.id, user);
	return reply.code(204).send();
};
