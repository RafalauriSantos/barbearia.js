const { z } = require("zod");

const createBarberSchema = z
	.object({
		nome: z.string().min(2).max(80).optional(),
		name: z.string().min(2).max(80).optional(),
		email: z.string().email().optional(),
		comissao_percent: z.coerce.number().min(0).max(100).optional(),
		send_invite: z.coerce.boolean().optional(),
	})
	.superRefine((payload, ctx) => {
		if (!payload.nome && !payload.name) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["nome"],
				message: "nome or name is required",
			});
		}
	});

const updateBarberSchema = z.object({
	nome: z.string().min(2).max(80).optional(),
	name: z.string().min(2).max(80).optional(),
	email: z.string().email().nullable().optional(),
	comissao_percent: z.coerce.number().min(0).max(100).optional(),
	ativo: z.boolean().optional(),
	active: z.boolean().optional(),
});

const inviteBarberSchema = z.object({
	email: z.string().email(),
});

function validateCreateBarber(body) {
	const payload = createBarberSchema.parse(body);
	return {
		...payload,
		nome: payload.nome || payload.name,
	};
}

function validateUpdateBarber(body) {
	const payload = updateBarberSchema.parse(body);
	return {
		...payload,
		nome: payload.nome || payload.name,
		ativo: payload.ativo ?? payload.active,
	};
}

function validateInviteBarber(body) {
	return inviteBarberSchema.parse(body);
}

module.exports = {
	validateCreateBarber,
	validateUpdateBarber,
	validateInviteBarber,
};
