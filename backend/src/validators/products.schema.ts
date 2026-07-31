import { z } from "zod";

const createSchema = z.object({
	name: z.string().min(1),
	price: z.coerce.number().nonnegative().optional(),
	purchase_type: z.enum(["avista", "consignado"]).optional(),
	cost_price: z.coerce.number().nonnegative().optional(),
	supplier_name: z.string().max(120).optional().nullable(),
	seller_commission_percent: z.coerce.number().min(0).max(100).optional(),
	stock_quantity: z.coerce.number().int().nonnegative().optional(),
});

const updateSchema = createSchema.partial();

export function validateCreateProduct(body: unknown) {
	return createSchema.parse(body);
}

export function validateUpdateProduct(body: unknown) {
	return updateSchema.parse(body);
}

if (typeof module !== "undefined" && module.exports) { module.exports = { validateCreateProduct, validateUpdateProduct }; }
export default { validateCreateProduct, validateUpdateProduct };
