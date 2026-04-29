const { z } = require("zod");

const createSchema = z.object({
	name: z.string().min(1),
	value: z.coerce.number().nonnegative().optional(),
	date: z.string().min(1),
});

const updateSchema = createSchema.partial();

function validateCreateExpense(body) {
	return createSchema.parse(body);
}

function validateUpdateExpense(body) {
	return updateSchema.parse(body);
}

module.exports = { validateCreateExpense, validateUpdateExpense };
