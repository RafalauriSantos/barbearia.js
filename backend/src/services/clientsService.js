const ClientsRepository = require("../repositories/clientsRepository");
const { AppError } = require("../lib/errors");

function getBarbeariaContext(user) {
	if (!user?.barbearia_id) {
		throw new AppError(
			403,
			"BARBEARIA_CONTEXT_REQUIRED",
			"Usuario sem barbearia vinculada.",
		);
	}
	return { barbeariaId: user.barbearia_id };
}

async function ensureClient(clientId, context) {
	const client = await ClientsRepository.findFixedClientById(clientId, context);
	if (!client) throw new AppError(404, "NOT_FOUND", "Cliente nao encontrado.");
	return client;
}

exports.listFixedClients = async function (user) {
	return ClientsRepository.findFixedClients(getBarbeariaContext(user));
};

exports.createFixedClient = async function (payload, user) {
	return ClientsRepository.createFixedClient(payload, getBarbeariaContext(user));
};

exports.updateFixedClient = async function (id, payload, user) {
	const context = getBarbeariaContext(user);
	await ensureClient(id, context);
	return ClientsRepository.updateFixedClient(id, payload, context);
};

exports.deleteFixedClient = async function (id, user) {
	const context = getBarbeariaContext(user);
	await ensureClient(id, context);
	await ClientsRepository.removeFixedClient(id, context);
	return true;
};

exports.createClientCut = async function (clientId, payload, user) {
	const context = getBarbeariaContext(user);
	await ensureClient(clientId, context);
	await ClientsRepository.createClientCut(clientId, payload, context);
	return ClientsRepository.findFixedClientById(clientId, context);
};

exports.updateClientCut = async function (clientId, cutId, payload, user) {
	const context = getBarbeariaContext(user);
	await ensureClient(clientId, context);
	await ClientsRepository.updateClientCut(clientId, cutId, payload, context);
	return ClientsRepository.findFixedClientById(clientId, context);
};

exports.deleteClientCut = async function (clientId, cutId, user) {
	const context = getBarbeariaContext(user);
	await ensureClient(clientId, context);
	await ClientsRepository.removeClientCut(clientId, cutId, context);
	return ClientsRepository.findFixedClientById(clientId, context);
};

exports.listWaitlist = async function (user) {
	return ClientsRepository.findWaitlist(getBarbeariaContext(user));
};

exports.createWaitlistEntry = async function (payload, user) {
	return ClientsRepository.createWaitlistEntry(payload, getBarbeariaContext(user));
};

exports.updateWaitlistEntry = async function (id, payload, user) {
	return ClientsRepository.updateWaitlistEntry(
		id,
		payload,
		getBarbeariaContext(user),
	);
};

exports.deleteWaitlistEntry = async function (id, user) {
	await ClientsRepository.removeWaitlistEntry(id, getBarbeariaContext(user));
	return true;
};
