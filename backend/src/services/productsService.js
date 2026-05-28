const ProductsRepository = require("../repositories/productsRepository");
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

exports.listProducts = async function (user) {
	return ProductsRepository.findAll(getBarbeariaContext(user));
};

exports.createProduct = async function (payload, user) {
	return ProductsRepository.create(payload, getBarbeariaContext(user));
};

exports.updateProduct = async function (id, updates, user) {
	const context = getBarbeariaContext(user);
	const existing = await ProductsRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found");
	return ProductsRepository.update(id, updates, context);
};

exports.deleteProduct = async function (id, user) {
	const context = getBarbeariaContext(user);
	const existing = await ProductsRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Product not found");
	await ProductsRepository.remove(id, context);
	return true;
};
