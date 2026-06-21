const t = require("tap");

const authServicePath = require.resolve("../src/services/authService");
const appointmentsServicePath = require.resolve(
	"../src/services/appointmentsService",
);
const controllerPath = require.resolve(
	"../src/controllers/appointmentsController",
);

t.test("invalid appointment is rejected before loading the user", async (t) => {
	let authCalls = 0;
	require.cache[authServicePath] = {
		exports: {
			getCurrentUser: async () => {
				authCalls += 1;
				return { id: "user-1" };
			},
		},
	};
	require.cache[appointmentsServicePath] = {
		exports: {
			createAppointment: async () => {
				throw new Error("service should not run");
			},
		},
	};
	delete require.cache[controllerPath];
	t.teardown(() => {
		delete require.cache[authServicePath];
		delete require.cache[appointmentsServicePath];
		delete require.cache[controllerPath];
	});

	const controller = require("../src/controllers/appointmentsController");
	await t.rejects(
		controller.create(
			{
				user: { userId: "user-1" },
				body: {
					client_name: "Cliente",
					day_key: "2026-02-30",
					time_slot: "10:00",
				},
			},
			{},
		),
	);

	t.equal(authCalls, 0);
});
