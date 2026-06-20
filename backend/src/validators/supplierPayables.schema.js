const { z } = require("zod");

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

exports.validateSupplierPayablesQuery = (query) =>
	z.object({
		status: z.enum(["aberto", "pago", "todos"]).optional(),
		start_date: dateSchema.optional(),
		end_date: dateSchema.optional(),
	}).parse(query || {});

exports.validatePaySupplierPayable = (body) =>
	z.object({ payment_date: dateSchema }).parse(body || {});

