const AuthService = require("../services/authService");
const ProductsService = require("../services/productsService");
const {
	validateCreateProduct,
	validateUpdateProduct,
} = require("../validators/products.schema");

async function getCurrentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.list = async (request, reply) => {
	const user = await getCurrentUser(request);
	const products = await ProductsService.listProducts(user);
	return reply.send(products);
};

exports.create = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateCreateProduct(request.body);
	const created = await ProductsService.createProduct(payload, user);
	return reply.code(201).send(created);
};

exports.update = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateUpdateProduct(request.body);
	const updated = await ProductsService.updateProduct(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
};

exports.remove = async (request, reply) => {
	const user = await getCurrentUser(request);
	await ProductsService.deleteProduct(request.params.id, user);
	return reply.code(204).send();
};
