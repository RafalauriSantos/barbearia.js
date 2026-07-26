process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

const t = require("tap");
const jwt = require("jsonwebtoken");
const ServicesService = require("../src/services/servicesService");
const ProductsService = require("../src/services/productsService");
const ExpensesService = require("../src/services/expensesService");
const ReceivablesService = require("../src/services/receivablesService");
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

	t.test("receivablesService blocks non-admin users (HTTP 403 RECEIVABLES_FORBIDDEN)", async (t) => {
		await t.rejects(
			ReceivablesService.create({ description: "Cobrança", value: 50 }, barberUser),
			{ status: 403, code: "RECEIVABLES_FORBIDDEN" },
			"receivables create rejects non-admin with 403",
		);

		await t.rejects(
			ReceivablesService.update("rec-1", { value: 60 }, barberUser),
			{ status: 403, code: "RECEIVABLES_FORBIDDEN" },
			"receivables update rejects non-admin with 403",
		);

		await t.rejects(
			ReceivablesService.receive("rec-1", { payment_method_id: "pm-1" }, barberUser),
			{ status: 403, code: "RECEIVABLES_FORBIDDEN" },
			"receivables receive rejects non-admin with 403",
		);

		await t.rejects(
			ReceivablesService.cancel("rec-1", barberUser),
			{ status: 403, code: "RECEIVABLES_FORBIDDEN" },
			"receivables cancel rejects non-admin with 403",
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

	t.test("updateAppointment rejects altering value, services, products, payment method or status on paid appointments with HTTP 400 APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN", async (t) => {
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
				{ status: 400, code: "APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN" },
				"altering status on paid appointment throws 400 APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN",
			);

			await t.rejects(
				AppointmentsService.updateAppointment("appt-paid-99", { value: 200 }, adminUser),
				{ status: 400, code: "APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN" },
				"altering value on paid appointment throws 400 APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN",
			);

			await t.rejects(
				AppointmentsService.updateAppointment("appt-paid-99", { services: [{ id: "s1" }] }, adminUser),
				{ status: 400, code: "APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN" },
				"altering services on paid appointment throws 400 APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN",
			);

			await t.rejects(
				AppointmentsService.updateAppointment("appt-paid-99", { payment_method_id: "pm-1" }, adminUser),
				{ status: 400, code: "APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN" },
				"altering payment method on paid appointment throws 400 APPOINTMENT_PAID_FINANCIAL_EDIT_FORBIDDEN",
			);
		} finally {
			AppointmentsRepository.findById = originalFindById;
		}
	});

	t.test("REAL HTTP ROUTE INTEGRATION: requireRole(['admin']) middleware enforces HTTP 403 for role 'barbeiro'", async (t) => {
		// Mock AuthService to return barberUser
		require.cache[require.resolve("../src/services/authService")] = {
			exports: {
				getCurrentUser: async () => barberUser,
			},
		};

		const { env } = require("../src/config/env");
		const { buildApp } = require("../src/app");
		const app = await buildApp();
		const barberToken = jwt.sign({ userId: barberUser.id, tokenVersion: 1 }, env.JWT_SECRET);
		const headers = { authorization: `Bearer ${barberToken}` };

		// 1. Services HTTP routes (POST, PUT, DELETE) -> HTTP 403
		const postService = await app.inject({ method: "POST", url: "/services", headers, payload: { name: "Corte", price: 50 } });
		t.equal(postService.statusCode, 403, "POST /services returns 403 for barbeiro");

		const putService = await app.inject({ method: "PUT", url: "/services/srv-1", headers, payload: { price: 60 } });
		t.equal(putService.statusCode, 403, "PUT /services/:id returns 403 for barbeiro");

		const deleteService = await app.inject({ method: "DELETE", url: "/services/srv-1", headers });
		t.equal(deleteService.statusCode, 403, "DELETE /services/:id returns 403 for barbeiro");

		// 2. Products HTTP routes (POST, PUT, DELETE) -> HTTP 403
		const postProduct = await app.inject({ method: "POST", url: "/products", headers, payload: { name: "Pomada", price: 30 } });
		t.equal(postProduct.statusCode, 403, "POST /products returns 403 for barbeiro");

		const putProduct = await app.inject({ method: "PUT", url: "/products/prod-1", headers, payload: { price: 35 } });
		t.equal(putProduct.statusCode, 403, "PUT /products/:id returns 403 for barbeiro");

		const deleteProduct = await app.inject({ method: "DELETE", url: "/products/prod-1", headers });
		t.equal(deleteProduct.statusCode, 403, "DELETE /products/:id returns 403 for barbeiro");

		// 3. Expenses HTTP routes (POST, PUT, DELETE) -> HTTP 403
		const postExpense = await app.inject({ method: "POST", url: "/expenses", headers, payload: { description: "Luz", value: 100 } });
		t.equal(postExpense.statusCode, 403, "POST /expenses returns 403 for barbeiro");

		const putExpense = await app.inject({ method: "PUT", url: "/expenses/exp-1", headers, payload: { value: 110 } });
		t.equal(putExpense.statusCode, 403, "PUT /expenses/:id returns 403 for barbeiro");

		const deleteExpense = await app.inject({ method: "DELETE", url: "/expenses/exp-1", headers });
		t.equal(deleteExpense.statusCode, 403, "DELETE /expenses/:id returns 403 for barbeiro");

		// 4. Receivables HTTP routes (POST, PUT, POST /receive, DELETE) -> HTTP 403
		const postReceivable = await app.inject({ method: "POST", url: "/receivables", headers, payload: { value: 50 } });
		t.equal(postReceivable.statusCode, 403, "POST /receivables returns 403 for barbeiro");

		const putReceivable = await app.inject({ method: "PUT", url: "/receivables/rec-1", headers, payload: { value: 60 } });
		t.equal(putReceivable.statusCode, 403, "PUT /receivables/:id returns 403 for barbeiro");

		const receiveReceivable = await app.inject({ method: "POST", url: "/receivables/rec-1/receive", headers, payload: { payment_method_id: "pm-1" } });
		t.equal(receiveReceivable.statusCode, 403, "POST /receivables/:id/receive returns 403 for barbeiro");

		const deleteReceivable = await app.inject({ method: "DELETE", url: "/receivables/rec-1", headers });
		t.equal(deleteReceivable.statusCode, 403, "DELETE /receivables/:id returns 403 for barbeiro");

		await app.close();
	});
});
