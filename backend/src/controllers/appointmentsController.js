const AppointmentsService = require("../services/appointmentsService");
const {
	validateCreateAppointment,
	validateUpdateAppointment,
} = require("../validators/appointments.schema");

exports.list = async (request, reply) => {
	const appointments = await AppointmentsService.listAppointments(
		request.query || {},
	);
	return reply.send(appointments);
};

exports.create = async (request, reply) => {
	const payload = validateCreateAppointment(request.body);
	const created = await AppointmentsService.createAppointment(payload);
	return reply.code(201).send(created);
};

exports.update = async (request, reply) => {
	const payload = validateUpdateAppointment(request.body);
	const updated = await AppointmentsService.updateAppointment(
		request.params.id,
		payload,
	);
	return reply.send(updated);
};

exports.remove = async (request, reply) => {
	await AppointmentsService.deleteAppointment(request.params.id);
	return reply.code(204).send();
};
