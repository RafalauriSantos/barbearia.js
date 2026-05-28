const ServicesRepository = require("../repositories/servicesRepository");
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

exports.listServices = async function (user) {
	return ServicesRepository.findAll(getBarbeariaContext(user));
};

exports.createService = async function (payload, user) {
	return ServicesRepository.create(payload, getBarbeariaContext(user));
};

exports.updateService = async function (id, updates, user) {
	const context = getBarbeariaContext(user);
	const existing = await ServicesRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Service not found");
	return ServicesRepository.update(id, updates, context);
};

exports.deleteService = async function (id, user) {
	const context = getBarbeariaContext(user);
	const existing = await ServicesRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Service not found");
	await ServicesRepository.remove(id, context);
	return true;
};
