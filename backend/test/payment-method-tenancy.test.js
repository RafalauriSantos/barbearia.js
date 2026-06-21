const t = require("tap");

function loadService(repository) {
	const repositoryPath = require.resolve(
		"../src/repositories/paymentMethodsRepository",
	);
	const servicePath = require.resolve("../src/services/paymentMethodsService");
	require.cache[repositoryPath] = { exports: repository };
	delete require.cache[servicePath];
	return require("../src/services/paymentMethodsService");
}

const admin = {
	id: "user-1",
	role: "admin",
	barbearia_id: "shop-1",
};

t.test("payment method listing is scoped to the authenticated shop", async (t) => {
	let receivedContext;
	const service = loadService({
		findAll: async (context) => {
			receivedContext = context;
			return [];
		},
	});

	await service.listPaymentMethods(admin);

	t.same(receivedContext, { barbeariaId: "shop-1" });
});

t.test("payment method update cannot leave the authenticated shop", async (t) => {
	const calls = [];
	const service = loadService({
		findById: async (id, context) => {
			calls.push(["find", id, context]);
			return { id, active: true };
		},
		update: async (id, updates, context) => {
			calls.push(["update", id, updates, context]);
			return { id, ...updates };
		},
	});

	await service.updatePaymentMethod("method-1", { fee_percent: 1.5 }, admin);

	t.same(calls, [
		["find", "method-1", { barbeariaId: "shop-1" }],
		[
			"update",
			"method-1",
			{ fee_percent: 1.5 },
			{ barbeariaId: "shop-1" },
		],
	]);
});
