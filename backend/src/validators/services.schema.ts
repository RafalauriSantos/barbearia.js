import { z } from "zod";

const createSchema = z.object({
	name: z.string().min(1),
	price: z.coerce.number().nonnegative().optional(),
});

const updateSchema = z.object({
	name: z.string().min(1).optional(),
	price: z.coerce.number().nonnegative().optional(),
});

export function validateCreateService(body: unknown) {
	const parsed = createSchema.parse(body);
	return parsed;
}

export function validateUpdateService(body: unknown) {
	const parsed = updateSchema.parse(body);
	return parsed;
}

export default { validateCreateService, validateUpdateService };
