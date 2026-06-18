const { z } = require("zod");

const createSchema = z.object({
	name: z.string().min(1),
	value: z.coerce.number().nonnegative().optional(),
	date: z.string().min(1),
});

const updateSchema = createSchema.partial();
const listQuerySchema = z.object({
	date: z.string().min(1).optional(),
	start_date: z.string().min(1).optional(),
	end_date: z.string().min(1).optional(),
});

function validateCreateExpense(body) {
	return createSchema.parse(body);
}

function validateUpdateExpense(body) {
	return updateSchema.parse(body);
}

function validateListExpensesQuery(query) {
	return listQuerySchema.parse(query || {});
}

module.exports = {
	validateCreateExpense,
	validateUpdateExpense,
	validateListExpensesQuery,
};
