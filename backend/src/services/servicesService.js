const ServicesRepository = require("../repositories/servicesRepository");
const AuditService = require("./auditService");
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

function assertAdminContext(user) {
	const context = getBarbeariaContext(user);
	if (user.role !== "admin") {
		throw new AppError(
			403,
			"SERVICES_FORBIDDEN",
			"Apenas administradores podem gerenciar servicos.",
		);
	}
	return context;
}

exports.listServices = async function (user) {
	return ServicesRepository.findAll(getBarbeariaContext(user));
};

exports.createService = async function (payload, user) {
	const service = await ServicesRepository.create(payload, assertAdminContext(user));
	await AuditService.logResourceChange({
		action: "SERVICE_CREATED",
		resourceType: "service",
		resourceId: service.id,
		user,
		newValues: { name: service.name, price: service.price },
	});
	return service;
};

exports.updateService = async function (id, updates, user) {
	const context = assertAdminContext(user);
	const existing = await ServicesRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Service not found");
	const updated = await ServicesRepository.update(id, updates, context);

	await AuditService.logResourceChange({
		action: "SERVICE_UPDATED",
		resourceType: "service",
		resourceId: id,
		user,
		oldValues: { name: existing.name, price: existing.price },
		newValues: { name: updated.name, price: updated.price },
	});

	return updated;
};

exports.deleteService = async function (id, user) {
	const context = assertAdminContext(user);
	const existing = await ServicesRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Service not found");
	await ServicesRepository.remove(id, context);

	await AuditService.logResourceChange({
		action: "SERVICE_DELETED",
		resourceType: "service",
		resourceId: id,
		user,
		oldValues: { name: existing.name, price: existing.price },
	});

	return true;
};
