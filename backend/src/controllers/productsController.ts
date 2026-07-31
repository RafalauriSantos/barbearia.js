const AuthService = require("../services/authService");
const ProductsService = require("../services/productsService");
const {
	validateCreateProduct,
	validateUpdateProduct,
} = require("../validators/products.schema");

async function getCurrentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function list(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const products = await ProductsService.listProducts(user);
	return reply.send(products);
}

export async function create(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateCreateProduct(request.body);
	const created = await ProductsService.createProduct(payload, user);
	return reply.code(201).send(created);
}

export async function update(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateUpdateProduct(request.body);
	const updated = await ProductsService.updateProduct(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
}

export async function remove(request: any, reply: any) {
	const user = await getCurrentUser(request);
	await ProductsService.deleteProduct(request.params.id, user);
	return reply.code(204).send();
}

export default {
	list,
	create,
	update,
	remove,
};
