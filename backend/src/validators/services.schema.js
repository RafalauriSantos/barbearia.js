const { z } = require("zod");

const createSchema = z.object({
	name: z.string().min(1),
	price: z.coerce.number().nonnegative().optional(),
});

const updateSchema = z.object({
	name: z.string().min(1).optional(),
	price: z.coerce.number().nonnegative().optional(),
});

function validateCreateService(body) {
	const parsed = createSchema.parse(body);
	return parsed;
}

function validateUpdateService(body) {
	const parsed = updateSchema.parse(body);
	return parsed;
}

module.exports = { validateCreateService, validateUpdateService };
