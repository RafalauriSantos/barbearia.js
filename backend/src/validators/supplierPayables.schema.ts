import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const validateSupplierPayablesQuery = (query: unknown) =>
	z.object({
		status: z.enum(["aberto", "pago", "todos"]).optional(),
		start_date: dateSchema.optional(),
		end_date: dateSchema.optional(),
	}).parse(query || {});

export const validatePaySupplierPayable = (body: unknown) =>
	z.object({ payment_date: dateSchema }).parse(body || {});

export const validateCreatePurchase = (body: unknown) =>
	z.object({
		produto_id: z.string().uuid(),
		fornecedor: z.string().min(1),
		quantidade: z.number().int().positive(),
		custo_unitario: z.number().nonnegative(),
		foi_pago_a_vista: z.boolean(),
		data_compra: dateSchema.optional(),
	}).parse(body || {});

export default {
	validateSupplierPayablesQuery,
	validatePaySupplierPayable,
	validateCreatePurchase,
};
