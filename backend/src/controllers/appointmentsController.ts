const AppointmentsService = require("../services/appointmentsService");
const AuthService = require("../services/authService");
const {
	validateCreateAppointment,
	validateUpdateAppointment,
	validateListAppointmentsQuery,
} = require("../validators/appointments.schema");

async function getCurrentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function list(request: any, reply: any) {
	const query = validateListAppointmentsQuery(request.query || {});
	const user = await getCurrentUser(request);
	const appointments = await AppointmentsService.listAppointments(
		query,
		user,
	);
	return reply.send(appointments);
}

export async function create(request: any, reply: any) {
	const payload = validateCreateAppointment(request.body);
	const user = await getCurrentUser(request);
	const created = await AppointmentsService.createAppointment(payload, user);
	return reply.code(201).send(created);
}

export async function update(request: any, reply: any) {
	const payload = validateUpdateAppointment(request.body);
	const user = await getCurrentUser(request);

	const updated = await AppointmentsService.updateAppointment(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
}

export async function remove(request: any, reply: any) {
	const user = await getCurrentUser(request);
	await AppointmentsService.deleteAppointment(request.params.id, user);
	return reply.code(204).send();
}

module.exports = {
	list,
	create,
	update,
	remove,
};
