const AuthService = require("../services/authService");
const ServicesService = require("../services/servicesService");
const {
	validateCreateService,
	validateUpdateService,
} = require("../validators/services.schema");

async function getCurrentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function list(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const services = await ServicesService.listServices(user);
	return reply.send(services);
}

export async function create(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateCreateService(request.body);
	const created = await ServicesService.createService(payload, user);
	return reply.code(201).send(created);
}

export async function update(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const { id } = request.params;
	const payload = validateUpdateService(request.body);
	const updated = await ServicesService.updateService(id, payload, user);
	return reply.send(updated);
}

export async function remove(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const { id } = request.params;
	await ServicesService.deleteService(id, user);
	return reply.code(204).send();
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	list,
	create,
	update,
	remove,
}; }
export default {
	list,
	create,
	update,
	remove,
};
