const t = require("tap");

const adminUser = {
	id: "admin-1",
	role: "admin",
	barbearia_id: "shop-1",
};

function loadService(repository) {
	require.cache[require.resolve("../src/repositories/supplierPayablesRepository")] = {
		exports: repository,
	};
	delete require.cache[require.resolve("../src/services/supplierPayablesService")];
	return require("../src/services/supplierPayablesService");
}

t.test("supplier payable payment is idempotent", async (t) => {
	let current = { id: "payable-1", status: "aberto" };
	let payCount = 0;
	const service = loadService({
		findById: async () => current,
		pay: async (_id, paymentDate) => {
			payCount += 1;
			current = { ...current, status: "pago", payment_date: paymentDate };
			return current;
		},
	});

	const first = await service.pay(
		"payable-1",
		{ payment_date: "2026-06-20" },
		adminUser,
	);
	const second = await service.pay(
		"payable-1",
		{ payment_date: "2026-06-20" },
		adminUser,
	);

	t.equal(first.status, "pago");
	t.equal(second.status, "pago");
	t.equal(payCount, 1);
});

t.test("barber cannot manage supplier payables", async (t) => {
	const service = loadService({});

	await t.rejects(
		service.list({}, { role: "barbeiro", barbearia_id: "shop-1" }),
		{ status: 403, code: "SUPPLIER_PAYABLES_FORBIDDEN" },
	);
});
