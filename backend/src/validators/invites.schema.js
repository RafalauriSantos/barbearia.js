const { z } = require("zod");

const acceptInviteSchema = z.object({
	password: z.string().min(8).optional(),
	nome: z.string().min(2).max(80).optional(),
	name: z.string().min(2).max(80).optional(),
});

function validateAcceptInvite(body) {
	const payload = acceptInviteSchema.parse(body || {});
	return {
		...payload,
		nome: payload.nome || payload.name,
	};
}

module.exports = { validateAcceptInvite };
