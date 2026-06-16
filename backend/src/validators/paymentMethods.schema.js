const { z } = require("zod");

const updateSchema = z.object({
	name: z.string().min(1).max(80).optional(),
	fee_percent: z.coerce.number().min(0).max(100).optional(),
	active: z.boolean().optional(),
	order: z.coerce.number().int().min(0).max(999).optional(),
});

function validateUpdatePaymentMethod(body) {
	return updateSchema.parse(body || {});
}

module.exports = { validateUpdatePaymentMethod };
