process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

const t = require("tap");

function loadRepository() {
	const calls = [];
	const supabasePath = require.resolve("../src/lib/supabase");
	const repositoryPath = require.resolve(
		"../src/repositories/appointmentsRepository",
	);
	const appointmentRow = {
		id: "appointment-1",
		barbearia_id: "shop-1",
		barbeiro_id: "barber-1",
		cliente_nome: "Cliente",
		data: "2026-06-21",
		hora: "10:00",
		total: 60,
		status_pagamento: "pendente",
		agendamento_servicos: [],
		agendamento_produtos: [],
	};

	const supabase = {
		async rpc(name, payload) {
			calls.push({ type: "rpc", name, payload });
			return {
				data: name === "salvar_agendamento_atomico" ? "appointment-1" : true,
				error: null,
			};
		},
		from(table) {
			calls.push({ type: "from", table });
			const query = {
				select() {
					return query;
				},
				eq() {
					return query;
				},
				async single() {
					return { data: appointmentRow, error: null };
				},
			};
			return query;
		},
	};

	require.cache[supabasePath] = { exports: supabase };
	delete require.cache[repositoryPath];
	return {
		repository: require("../src/repositories/appointmentsRepository"),
		calls,
	};
}

t.test("appointment create uses one atomic save RPC", async (t) => {
	const { repository, calls } = loadRepository();
	await repository.create(
		{
			client_name: "Cliente",
			day_key: "2026-06-21",
			time_slot: "10:00",
			services: [{ id: "service-1", quantity: 1, price: 40, name: "Corte" }],
			products: [{ id: "product-1", quantity: 1, price: 20, name: "Gel" }],
		},
		{ barbeariaId: "shop-1", barbeiroId: "barber-1", userId: "user-1" },
	);

	const rpcCalls = calls.filter((call) => call.type === "rpc");
	t.equal(rpcCalls.length, 1);
	t.equal(rpcCalls[0].name, "salvar_agendamento_atomico");
	t.equal(rpcCalls[0].payload.p_agendamento.barbearia_id, "shop-1");
	t.equal(rpcCalls[0].payload.p_usuario_id, "user-1");
	t.equal(rpcCalls[0].payload.p_servicos[0].id, "service-1");
	t.equal(rpcCalls[0].payload.p_produtos[0].id, "product-1");
});

t.test("appointment update uses the same atomic save RPC", async (t) => {
	const { repository, calls } = loadRepository();
	await repository.update(
		"appointment-1",
		{ status: "paid", products: [] },
		{ barbeariaId: "shop-1", userId: "user-1" },
	);

	const rpcCalls = calls.filter((call) => call.type === "rpc");
	t.equal(rpcCalls.length, 1);
	t.equal(rpcCalls[0].name, "salvar_agendamento_atomico");
	t.equal(rpcCalls[0].payload.p_agendamento.id, "appointment-1");
});

t.test("appointment delete uses one atomic delete RPC", async (t) => {
	const { repository, calls } = loadRepository();
	await repository.remove("appointment-1", { barbeariaId: "shop-1" });

	const rpcCalls = calls.filter((call) => call.type === "rpc");
	t.same(rpcCalls, [
		{
			type: "rpc",
			name: "excluir_agendamento_atomico",
			payload: {
				p_agendamento_id: "appointment-1",
				p_barbearia_id: "shop-1",
			},
		},
	]);
});
