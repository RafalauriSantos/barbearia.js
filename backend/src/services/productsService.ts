const ProductsRepository = require("../repositories/productsRepository");
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
			"PRODUCTS_FORBIDDEN",
			"Apenas administradores podem gerenciar produtos.",
		);
	}
	return context;
}

export async function listProducts(user: any) {
	return ProductsRepository.findAll(getBarbeariaContext(user));
}

export async function createProduct(payload: Record<string, any>, user: any) {
	const product = await ProductsRepository.create(payload, assertAdminContext(user));
	await AuditService.logResourceChange({
		action: "PRODUCT_CREATED",
		resourceType: "product",
		resourceId: product.id,
		user,
		newValues: { name: product.name, price: product.price },
	});
	return product;
}

export async function updateProduct(id: string, updates: Record<string, any>, user: any) {
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
}

export async function deleteProduct(id: string, user: any) {
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
}

module.exports = {
	listProducts,
	createProduct,
	updateProduct,
	deleteProduct,
};
export default module.exports;
