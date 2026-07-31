const InvitesService = require("../services/invitesService");
const { validateAcceptInvite } = require("../validators/invites.schema");

function toPublicUser(user: any) {
	return {
		id: user.id,
		nome: user.nome || user.name || "",
		email: user.email,
		role: user.role || "barbeiro",
		barbearia_id: user.barbearia_id || null,
		barbeiro_id: user.barbeiro_id || null,
	};
}

export async function get(request: any, reply: any) {
	const invite = await InvitesService.getInviteByToken(request.params.token);
	return reply.send(invite);
}

export async function accept(request: any, reply: any) {
	const payload = validateAcceptInvite(request.body);
	const session = await InvitesService.acceptInvite(request.params.token, payload);
	return reply.send({
		accessToken: session.accessToken,
		refreshToken: session.refreshToken,
		user: toPublicUser(session.user),
	});
}

export default {
	get,
	accept,
};
