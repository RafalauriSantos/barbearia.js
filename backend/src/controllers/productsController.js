const ProductsService = require("../services/productsService");
const {
	validateCreateProduct,
	validateUpdateProduct,
} = require("../validators/products.schema");

exports.list = async (request, reply) => {
	const products = await ProductsService.listProducts();
	return reply.send(products);
};

exports.create = async (request, reply) => {
	const payload = validateCreateProduct(request.body);
	const created = await ProductsService.createProduct(payload);
	return reply.code(201).send(created);
};

exports.update = async (request, reply) => {
	const payload = validateUpdateProduct(request.body);
	const updated = await ProductsService.updateProduct(request.params.id, payload);
	return reply.send(updated);
};

exports.remove = async (request, reply) => {
	await ProductsService.deleteProduct(request.params.id);
	return reply.code(204).send();
};
