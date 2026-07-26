const t = require("tap");
const ServicesService = require("../src/services/servicesService");
const ProductsService = require("../src/services/productsService");
const ExpensesService = require("../src/services/expensesService");
const AppointmentsService = require("../src/services/appointmentsService");
const AppointmentsRepository = require("../src/repositories/appointmentsRepository");

t.test("RBAC 403 Restrictions & Paid Appointment Immutability Suite", async (t) => {
	const barberUser = {
		id: "barber-user-id",
		role: "barbeiro",
		barbearia_id: "shop-123",
		barbeiro_id: "barber-123",
	};

	const adminUser = {
		id: "admin-user-id",
		role: "admin",
		barbearia_id: "shop-123",
	};

	t.test("servicesService blocks non-admin users (HTTP 403 SERVICES_FORBIDDEN)", async (t) => {
		await t.rejects(
			ServicesService.createService({ name: "Corte", price: 50 }, barberUser),
			{ status: 403, code: "SERVICES_FORBIDDEN" },
			"createService rejects non-admin with 403",
		);

		await t.rejects(
			ServicesService.updateService("srv-1", { price: 60 }, barberUser),
			{ status: 403, code: "SERVICES_FORBIDDEN" },
			"updateService rejects non-admin with 403",
		);

		await t.rejects(
			ServicesService.deleteService("srv-1", barberUser),
			{ status: 403, code: "SERVICES_FORBIDDEN" },
			"deleteService rejects non-admin with 403",
		);
	});

	t.test("productsService blocks non-admin users (HTTP 403 PRODUCTS_FORBIDDEN)", async (t) => {
		await t.rejects(
			ProductsService.createProduct({ name: "Pomada", price: 30 }, barberUser),
			{ status: 403, code: "PRODUCTS_FORBIDDEN" },
			"createProduct rejects non-admin with 403",
		);

		await t.rejects(
			ProductsService.updateProduct("prod-1", { price: 35 }, barberUser),
			{ status: 403, code: "PRODUCTS_FORBIDDEN" },
			"updateProduct rejects non-admin with 403",
		);

		await t.rejects(
			ProductsService.deleteProduct("prod-1", barberUser),
			{ status: 403, code: "PRODUCTS_FORBIDDEN" },
			"deleteProduct rejects non-admin with 403",
		);
	});

	t.test("expensesService blocks non-admin users (HTTP 403 EXPENSES_FORBIDDEN)", async (t) => {
		await t.rejects(
			ExpensesService.createExpense({ description: "Energia", value: 150 }, barberUser),
			{ status: 403, code: "EXPENSES_FORBIDDEN" },
			"createExpense rejects non-admin with 403",
		);

		await t.rejects(
			ExpensesService.updateExpense("exp-1", { value: 160 }, barberUser),
			{ status: 403, code: "EXPENSES_FORBIDDEN" },
			"updateExpense rejects non-admin with 403",
		);

		await t.rejects(
			ExpensesService.deleteExpense("exp-1", barberUser),
			{ status: 403, code: "EXPENSES_FORBIDDEN" },
			"deleteExpense rejects non-admin with 403",
		);
	});

	t.test("updateAppointment rejects altering net_value/payment_fee_value with HTTP 400 READONLY_FIELD", async (t) => {
		await t.rejects(
			AppointmentsService.updateAppointment("appt-1", { net_value: 100 }, adminUser),
			{ status: 400, code: "READONLY_FIELD" },
			"passing net_value throws 400 READONLY_FIELD",
		);

		await t.rejects(
			AppointmentsService.updateAppointment("appt-1", { payment_fee_value: 15 }, adminUser),
			{ status: 400, code: "READONLY_FIELD" },
			"passing payment_fee_value throws 400 READONLY_FIELD",
		);
	});

	t.test("updateAppointment rejects altering status on paid appointments with HTTP 400 APPOINTMENT_PAID_READONLY", async (t) => {
		const originalFindById = AppointmentsRepository.findById;
		AppointmentsRepository.findById = async () => ({
			id: "appt-paid-99",
			barbearia_id: "shop-123",
			barbeiro_id: "barber-123",
			status: "paid",
			status_pagamento: "pago",
		});

		try {
			await t.rejects(
				AppointmentsService.updateAppointment("appt-paid-99", { status: "normal" }, adminUser),
				{ status: 400, code: "APPOINTMENT_PAID_READONLY" },
				"altering status on paid appointment throws 400 APPOINTMENT_PAID_READONLY",
			);
		} finally {
			AppointmentsRepository.findById = originalFindById;
		}
	});
});
