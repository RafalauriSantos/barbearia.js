const AuthService = require("../services/authService");
const ServicesService = require("../services/servicesService");
const {
	validateCreateService,
	validateUpdateService,
} = require("../validators/services.schema");

async function getCurrentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.list = async (request, reply) => {
	const user = await getCurrentUser(request);
	const services = await ServicesService.listServices(user);
	return reply.send(services);
};

exports.create = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateCreateService(request.body);
	const created = await ServicesService.createService(payload, user);
	return reply.code(201).send(created);
};

exports.update = async (request, reply) => {
	const user = await getCurrentUser(request);
	const { id } = request.params;
	const payload = validateUpdateService(request.body);
	const updated = await ServicesService.updateService(id, payload, user);
	return reply.send(updated);
};

exports.remove = async (request, reply) => {
	const user = await getCurrentUser(request);
	const { id } = request.params;
	await ServicesService.deleteService(id, user);
	return reply.code(204).send();
};
