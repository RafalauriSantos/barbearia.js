const AuthService = require("../services/authService");
const BarbersService = require("../services/barbersService");
const InvitesService = require("../services/invitesService");
const {
	validateCreateBarber,
	validateUpdateBarber,
	validateInviteBarber,
} = require("../validators/barbers.schema");

async function getCurrentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.list = async (request, reply) => {
	const user = await getCurrentUser(request);
	const barbers = await BarbersService.listBarbers(user);
	return reply.send(barbers);
};

exports.create = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateCreateBarber(request.body);
	const barber = await BarbersService.createBarber(payload, user);
	return reply.code(201).send(barber);
};

exports.update = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateUpdateBarber(request.body);
	const barber = await BarbersService.updateBarber(request.params.id, payload, user);
	return reply.send(barber);
};

exports.invite = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateInviteBarber(request.body);
	const invite = await InvitesService.createBarberInvite(
		request.params.id,
		payload,
		user,
	);
	return reply.code(201).send(invite);
};
