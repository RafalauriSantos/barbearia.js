const ProductsRepository = require("../repositories/productsRepository");
const { AppError } = require("../lib/errors");

exports.listProducts = async function () {
	return ProductsRepository.findAll();
};

exports.createProduct = async function (payload) {
	return ProductsRepository.create(payload);
};

exports.updateProduct = async function (id, updates) {
	const existing = await ProductsRepository.findById(id);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found");
	return ProductsRepository.update(id, updates);
};

exports.deleteProduct = async function (id) {
	const existing = await ProductsRepository.findById(id);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found");
	await ProductsRepository.remove(id);
	return true;
};
