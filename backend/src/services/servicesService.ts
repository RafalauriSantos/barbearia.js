const ServicesRepository = require("../repositories/servicesRepository");
const AuditService = require("./auditService");
import { AppError } from "../lib/errors";

function getBarbeariaContext(user: any) {
	if (!user?.barbearia_id) {
		throw new AppError(
			403,
			"BARBEARIA_CONTEXT_REQUIRED",
			"Usuario sem barbearia vinculada.",
		);
	}
	return { barbeariaId: user.barbearia_id };
}

function assertAdminContext(user: any) {
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

export async function listServices(user: any) {
	return ServicesRepository.findAll(getBarbeariaContext(user));
}

export async function createService(payload: Record<string, any>, user: any) {
	const service = await ServicesRepository.create(payload, assertAdminContext(user));
	await AuditService.logResourceChange({
		action: "SERVICE_CREATED",
		resourceType: "service",
		resourceId: service.id,
		user,
		newValues: { name: service.name, price: service.price },
	});
	return service;
}

export async function updateService(id: string, updates: Record<string, any>, user: any) {
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
}

export async function deleteService(id: string, user: any) {
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
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	listServices,
	createService,
	updateService,
	deleteService,
}; }
export default {
	listServices,
	createService,
	updateService,
	deleteService,
};
