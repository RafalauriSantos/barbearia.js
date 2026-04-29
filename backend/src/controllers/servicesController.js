const ServicesService = require("../services/servicesService");
const {
	validateCreateService,
	validateUpdateService,
} = require("../validators/services.schema");

exports.list = async (request, reply) => {
	const services = await ServicesService.listServices();
	return reply.send(services);
};

exports.create = async (request, reply) => {
	const payload = validateCreateService(request.body);
	const created = await ServicesService.createService(payload);
	return reply.code(201).send(created);
};

exports.update = async (request, reply) => {
	const { id } = request.params;
	const payload = validateUpdateService(request.body);
	const updated = await ServicesService.updateService(id, payload);
	return reply.send(updated);
};

exports.remove = async (request, reply) => {
	const { id } = request.params;
	await ServicesService.deleteService(id);
	return reply.code(204).send();
};
