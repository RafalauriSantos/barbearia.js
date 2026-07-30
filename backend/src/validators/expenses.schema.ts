import { z } from "zod";

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

export function validateCreateExpense(body: unknown) {
	return createSchema.parse(body);
}

export function validateUpdateExpense(body: unknown) {
	return updateSchema.parse(body);
}

export function validateListExpensesQuery(query: unknown) {
	return listQuerySchema.parse(query || {});
}

module.exports = {
	validateCreateExpense,
	validateUpdateExpense,
	validateListExpensesQuery,
};
