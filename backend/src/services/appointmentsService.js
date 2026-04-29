const AppointmentsRepository = require("../repositories/appointmentsRepository");
const { AppError } = require("../lib/errors");

exports.listAppointments = async function ({ data, day_key } = {}) {
	return AppointmentsRepository.findAll({ date: data || day_key });
};

exports.createAppointment = async function (payload) {
	return AppointmentsRepository.create(payload);
};

exports.updateAppointment = async function (id, updates) {
	const existing = await AppointmentsRepository.findById(id);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Appointment not found");
	return AppointmentsRepository.update(id, updates);
};

exports.deleteAppointment = async function (id) {
	const existing = await AppointmentsRepository.findById(id);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Appointment not found");
	await AppointmentsRepository.remove(id);
	return true;
};
