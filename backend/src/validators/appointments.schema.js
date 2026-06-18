const { z } = require("zod");

const itemSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).optional(),
	price: z.coerce.number().nonnegative(),
	quantity: z.coerce.number().int().positive().optional(),
	purchase_type: z.enum(["avista", "consignado"]).optional(),
	cost_price: z.coerce.number().nonnegative().optional(),
	supplier_name: z.string().max(120).optional().nullable(),
	seller_commission_percent: z.coerce.number().min(0).max(100).optional(),
});

const appointmentSchema = z.object({
	cliente_nome: z.string().min(1).optional(),
	data: z.string().min(1).optional(),
	hora: z.string().min(1).optional(),
	barbearia_id: z.union([z.string(), z.number()]).optional(),
	barbeiro_id: z.string().min(1).optional(),
	client_name: z.string().min(1).optional(),
	day_key: z.string().min(1).optional(),
	time_slot: z.string().min(1).optional(),
	value: z.coerce.number().nonnegative().optional(),
	status: z.enum(["normal", "paid", "fiado"]).optional(),
	service_id: z.string().optional(),
	service_name: z.string().optional(),
	services: z.array(itemSchema).optional(),
	products: z.array(itemSchema).optional(),
	prazo_date: z.string().nullable().optional(),
	barber_name: z.string().optional(),
	forma_pagamento_id: z.string().uuid().nullable().optional(),
	payment_method_id: z.string().uuid().nullable().optional(),
	forma_pagamento: z.string().optional(),
	payment_fee_percent: z.coerce.number().min(0).max(100).optional(),
	payment_fee_value: z.coerce.number().nonnegative().optional(),
	net_value: z.coerce.number().nonnegative().optional(),
});

const listQuerySchema = z.object({
	data: z.string().min(1).optional(),
	day_key: z.string().min(1).optional(),
	barbeiro_id: z.string().min(1).optional(),
	barber_id: z.string().min(1).optional(),
});

const createSchema = appointmentSchema.superRefine((payload, ctx) => {
	if (!payload.cliente_nome && !payload.client_name) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["client_name"],
			message: "client_name or cliente_nome is required",
		});
	}
	if (!payload.data && !payload.day_key) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["day_key"],
			message: "day_key or data is required",
		});
	}
	if (!payload.hora && !payload.time_slot) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["time_slot"],
			message: "time_slot or hora is required",
		});
	}
});

function validateCreateAppointment(body) {
	return createSchema.parse(body);
}

function validateUpdateAppointment(body) {
	return appointmentSchema.parse(body);
}

function validateListAppointmentsQuery(query) {
	return listQuerySchema.parse(query);
}

module.exports = {
	validateCreateAppointment,
	validateUpdateAppointment,
	validateListAppointmentsQuery,
};
