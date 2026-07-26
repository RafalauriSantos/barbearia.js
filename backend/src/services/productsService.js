const ProductsRepository = require("../repositories/productsRepository");
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
			"PRODUCTS_FORBIDDEN",
			"Apenas administradores podem gerenciar produtos.",
		);
	}
	return context;
}

exports.listProducts = async function (user) {
	return ProductsRepository.findAll(getBarbeariaContext(user));
};

exports.createProduct = async function (payload, user) {
	const product = await ProductsRepository.create(payload, assertAdminContext(user));
	await AuditService.logResourceChange({
		action: "PRODUCT_CREATED",
		resourceType: "product",
		resourceId: product.id,
		user,
		newValues: { name: product.name, price: product.price },
	});
	return product;
};

exports.updateProduct = async function (id, updates, user) {
	const context = assertAdminContext(user);
	const existing = await ProductsRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found");
	const updated = await ProductsRepository.update(id, updates, context);

	await AuditService.logResourceChange({
		action: "PRODUCT_UPDATED",
		resourceType: "product",
		resourceId: id,
		user,
		oldValues: { name: existing.name, price: existing.price },
		newValues: { name: updated.name, price: updated.price },
	});

	return updated;
};

exports.deleteProduct = async function (id, user) {
	const context = assertAdminContext(user);
	const existing = await ProductsRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found");
	await ProductsRepository.remove(id, context);

	await AuditService.logResourceChange({
		action: "PRODUCT_DELETED",
		resourceType: "product",
		resourceId: id,
		user,
		oldValues: { name: existing.name, price: existing.price },
	});

	return true;
};
