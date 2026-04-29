const { z } = require("zod");

const createSchema = z.object({
	name: z.string().min(1),
	price: z.coerce.number().nonnegative().optional(),
});

const updateSchema = createSchema.partial();

function validateCreateProduct(body) {
	return createSchema.parse(body);
}

function validateUpdateProduct(body) {
	return updateSchema.parse(body);
}

module.exports = { validateCreateProduct, validateUpdateProduct };
