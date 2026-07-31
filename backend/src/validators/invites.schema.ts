import { z } from "zod";

const acceptInviteSchema = z.object({
	password: z.string().min(8).optional(),
	nome: z.string().min(2).max(80).optional(),
	name: z.string().min(2).max(80).optional(),
});

export function validateAcceptInvite(body: unknown) {
	const payload = acceptInviteSchema.parse(body || {});
	return {
		...payload,
		nome: payload.nome || payload.name,
	};
}

if (typeof module !== "undefined" && module.exports) { module.exports = { validateAcceptInvite }; }
export default { validateAcceptInvite };
