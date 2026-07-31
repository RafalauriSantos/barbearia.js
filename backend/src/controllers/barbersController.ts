const AuthService = require("../services/authService");
const BarbersService = require("../services/barbersService");
const InvitesService = require("../services/invitesService");
const {
	validateCreateBarber,
	validateUpdateBarber,
	validateInviteBarber,
} = require("../validators/barbers.schema");

async function getCurrentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function list(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const barbers = await BarbersService.listBarbers(user);
	return reply.send(barbers);
}

export async function create(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateCreateBarber(request.body);
	const barber = await BarbersService.createBarber(payload, user);
	return reply.code(201).send(barber);
}

export async function update(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateUpdateBarber(request.body);
	const barber = await BarbersService.updateBarber(request.params.id, payload, user);
	return reply.send(barber);
}

export async function invite(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateInviteBarber(request.body);
	const invite = await InvitesService.createBarberInvite(
		request.params.id,
		payload,
		user,
		request.env,
	);
	return reply.code(201).send(invite);
}

export async function destroy(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const result = await BarbersService.deleteBarber(request.params.id, user);
	return reply.send(result);
}

export default {
	list,
	create,
	update,
	invite,
	destroy,
};
