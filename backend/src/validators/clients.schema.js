const { z } = require("zod");

const optionalText = z
	.string()
	.max(500)
	.optional()
	.nullable()
	.transform((value) => value || "");

const createFixedClientSchema = z.object({
	name: z.string().trim().min(2).max(120),
	phone: z.string().trim().max(40).optional().nullable(),
	notes: optionalText,
	interval_days: z.coerce.number().int().positive().max(365).optional(),
	package_total_cuts: z.coerce.number().int().min(0).max(120).optional(),
	barbeiro_id: z.string().uuid().optional(),
});

const updateFixedClientSchema = createFixedClientSchema.partial().extend({
	active: z.boolean().optional(),
});

const createClientCutSchema = z.object({
	date: z.string().trim().min(1),
	paid: z.boolean().optional(),
	value: z.coerce.number().nonnegative().max(99999.99).optional(),
	notes: optionalText,
});

const updateClientCutSchema = createClientCutSchema.partial();

const waitlistSchema = z.object({
	name: z.string().trim().min(2).max(120),
	phone: z.string().trim().max(40).optional().nullable(),
	preference: z.string().trim().max(120).optional().nullable(),
	notes: optionalText,
	status: z.enum(["aguardando", "agendado", "cancelado"]).optional(),
	barbeiro_id: z.string().uuid().optional(),
});

const listClientsQuerySchema = z.object({
	barbeiro_id: z.string().uuid().optional(),
});

function validateCreateFixedClient(body) {
	return createFixedClientSchema.parse(body);
}

function validateUpdateFixedClient(body) {
	return updateFixedClientSchema.parse(body);
}

function validateCreateClientCut(body) {
	return createClientCutSchema.parse(body);
}

function validateUpdateClientCut(body) {
	return updateClientCutSchema.parse(body);
}

function validateWaitlistEntry(body) {
	return waitlistSchema.parse(body);
}

function validateUpdateWaitlistEntry(body) {
	return waitlistSchema.partial().parse(body);
}

function validateListClientsQuery(query) {
	return listClientsQuerySchema.parse(query || {});
}

module.exports = {
	validateCreateFixedClient,
	validateUpdateFixedClient,
	validateCreateClientCut,
	validateUpdateClientCut,
	validateWaitlistEntry,
	validateUpdateWaitlistEntry,
	validateListClientsQuery,
};
