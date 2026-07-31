const AuthService = require("../services/authService");
const ClientsService = require("../services/clientsService");
const {
	validateCreateFixedClient,
	validateUpdateFixedClient,
	validateCreateClientCut,
	validateUpdateClientCut,
	validateWaitlistEntry,
	validateUpdateWaitlistEntry,
	validateListClientsQuery,
} = require("../validators/clients.schema");

async function getCurrentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function listFixed(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const query = validateListClientsQuery(request.query);
	const clients = await ClientsService.listFixedClients(user, query);
	return reply.send(clients);
}

export async function createFixed(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateCreateFixedClient(request.body);
	const created = await ClientsService.createFixedClient(payload, user);
	return reply.code(201).send(created);
}

export async function updateFixed(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateUpdateFixedClient(request.body);
	const updated = await ClientsService.updateFixedClient(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
}

export async function removeFixed(request: any, reply: any) {
	const user = await getCurrentUser(request);
	await ClientsService.deleteFixedClient(request.params.id, user);
	return reply.code(204).send();
}

export async function createCut(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateCreateClientCut(request.body);
	const client = await ClientsService.createClientCut(
		request.params.id,
		payload,
		user,
	);
	return reply.code(201).send(client);
}

export async function updateCut(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateUpdateClientCut(request.body);
	const client = await ClientsService.updateClientCut(
		request.params.id,
		request.params.cutId,
		payload,
		user,
	);
	return reply.send(client);
}

export async function removeCut(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const client = await ClientsService.deleteClientCut(
		request.params.id,
		request.params.cutId,
		user,
	);
	return reply.send(client);
}

export async function listWaitlist(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const query = validateListClientsQuery(request.query);
	const entries = await ClientsService.listWaitlist(user, query);
	return reply.send(entries);
}

export async function createWaitlist(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateWaitlistEntry(request.body);
	const created = await ClientsService.createWaitlistEntry(payload, user);
	return reply.code(201).send(created);
}

export async function updateWaitlist(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateUpdateWaitlistEntry(request.body);
	const updated = await ClientsService.updateWaitlistEntry(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
}

export async function removeWaitlist(request: any, reply: any) {
	const user = await getCurrentUser(request);
	await ClientsService.deleteWaitlistEntry(request.params.id, user);
	return reply.code(204).send();
}

export default {
	listFixed,
	createFixed,
	updateFixed,
	removeFixed,
	createCut,
	updateCut,
	removeCut,
	listWaitlist,
	createWaitlist,
	updateWaitlist,
	removeWaitlist,
};
