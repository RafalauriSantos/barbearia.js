const AppointmentsService = require("../services/appointmentsService");
const AuthService = require("../services/authService");
const {
	validateCreateAppointment,
	validateUpdateAppointment,
	validateListAppointmentsQuery,
} = require("../validators/appointments.schema");

async function getCurrentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.list = async (request, reply) => {
	const user = await getCurrentUser(request);
	const query = validateListAppointmentsQuery(request.query || {});
	const appointments = await AppointmentsService.listAppointments(
		query,
		user,
	);
	return reply.send(appointments);
};

exports.create = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateCreateAppointment(request.body);
	const created = await AppointmentsService.createAppointment(payload, user);
	return reply.code(201).send(created);
};

exports.update = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateUpdateAppointment(request.body);
	
	const updated = await AppointmentsService.updateAppointment(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
};

exports.remove = async (request, reply) => {
	const user = await getCurrentUser(request);
	await AppointmentsService.deleteAppointment(request.params.id, user);
	return reply.code(204).send();
};
