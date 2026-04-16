const fastify = require("fastify")({ logger: true });

// Rota simples para testar se o servidor esta no ar.
fastify.get("/teste", async () => {
	return { ok: true };
});

// Recebe um agendamento e devolve os mesmos dados.
fastify.post("/agendamentos", async (request) => {
	const { cliente_nome, data, hora, barbearia_id } = request.body;

	return {
		cliente_nome,
		data,
		hora,
		barbearia_id,
	};
});

// Liga o servidor na porta 3000.
fastify.listen({ port: 3000 }, (err, address) => {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}

	console.log(`Servidor rodando em ${address}`);
});
