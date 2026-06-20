const { z } = require("zod");

const optionalText = z.string().trim().max(500).optional().nullable();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const receivableSchema = z.object({
	client_name: z.string().trim().min(2).max(120),
	description: z.string().trim().min(2).max(160),
	notes: optionalText,
	value: z.coerce.number().positive().max(999999.99),
	debt_date: dateSchema,
	debt_time: timeSchema.optional().nullable(),
	due_date: dateSchema.optional().nullable(),
	barbeiro_id: z.string().uuid().optional(),
	cliente_id: z.string().uuid().optional().nullable(),
});

const querySchema = z.object({
	status: z.enum(["aberto", "pago", "todos"]).optional(),
	start_date: dateSchema.optional(),
	end_date: dateSchema.optional(),
	search: z.string().trim().max(120).optional(),
	barbeiro_id: z.string().uuid().optional(),
});

const receiveSchema = z.object({
	payment_method_id: z.string().uuid(),
	payment_date: dateSchema.optional(),
});

exports.validateReceivablesQuery = (query) => querySchema.parse(query || {});
exports.validateCreateReceivable = (body) => receivableSchema.parse(body);
exports.validateUpdateReceivable = (body) => receivableSchema.partial().parse(body);
exports.validateReceiveReceivable = (body) => receiveSchema.parse(body);
