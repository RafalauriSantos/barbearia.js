const ServicesRepository = require("../repositories/servicesRepository");
const { AppError } = require("../lib/errors");

exports.listServices = async function () {
	return ServicesRepository.findAll();
};

exports.createService = async function (payload) {
	// Business rules can be applied here
	return ServicesRepository.create(payload);
};

exports.updateService = async function (id, updates) {
	const existing = await ServicesRepository.findById(id);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Service not found");
	return ServicesRepository.update(id, updates);
};

exports.deleteService = async function (id) {
	const deleted = await ServicesRepository.remove(id);
	if (!deleted) throw new AppError(404, "NOT_FOUND", "Service not found");
	return true;
};
