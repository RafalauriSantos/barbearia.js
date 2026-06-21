const t = require("tap");

const {
	validateCreateAppointment,
	validateListAppointmentsQuery,
} = require("../src/validators/appointments.schema");

t.test("appointment validation rejects impossible calendar dates", (t) => {
	const createError = t.throws(() =>
		validateCreateAppointment({
			client_name: "Cliente",
			day_key: "2026-02-30",
			time_slot: "10:00",
		}),
	);
	const listError = t.throws(() =>
		validateListAppointmentsQuery({ data: "2026-13-01" }),
	);
	t.equal(createError.issues[0].path[0], "day_key");
	t.equal(listError.issues[0].path[0], "data");
	t.end();
});

t.test("appointment validation rejects malformed times", (t) => {
	const error = t.throws(() =>
		validateCreateAppointment({
			client_name: "Cliente",
			day_key: "2026-06-20",
			time_slot: "25:90",
		}),
	);
	t.equal(error.issues[0].path[0], "time_slot");
	t.end();
});

t.test("appointment validation accepts valid date and time aliases", (t) => {
	const payload = validateCreateAppointment({
		cliente_nome: "Cliente",
		data: "2026-06-20",
		hora: "09:30",
	});

	t.equal(payload.data, "2026-06-20");
	t.equal(payload.hora, "09:30");
	t.end();
});
