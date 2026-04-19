const fastify = require("fastify")({ logger: true });
const cors = require("@fastify/cors");

const PORT = Number(process.env.PORT) || 3000;
const agendamentos = [];

function gerarId() {
	return Math.random().toString(36).substring(2, 10);
}

function registrarRotas(app) {
	// Rota simples para testar se o servidor esta no ar.
	app.get("/teste", async () => {
		return { ok: true };
	});

	// Lista agendamentos. Pode filtrar por data via query string.
	app.get("/agendamentos", async (request) => {
		const { data } = request.query || {};

		if (!data) {
			return agendamentos;
		}

		return agendamentos.filter((item) => item.data === data);
	});

	// Recebe um agendamento e devolve os mesmos dados.
	app.post("/agendamentos", async (request, reply) => {
		const { cliente_nome, data, hora, barbearia_id } = request.body || {};

		if (!cliente_nome || !data || !hora || !barbearia_id) {
			return reply.code(400).send({
				erro: "Campos obrigatorios: cliente_nome, data, hora, barbearia_id",
			});
		}

		const novoAgendamento = {
			id: gerarId(),
			...request.body,
			cliente_nome,
			data,
			hora,
			barbearia_id,
		};

		agendamentos.push(novoAgendamento);

		return reply.code(201).send(novoAgendamento);
	});

	// Atualiza um agendamento existente por id.
	app.put("/agendamentos/:id", async (request, reply) => {
		const { id } = request.params;
		const updates = request.body || {};

		const index = agendamentos.findIndex((item) => item.id === id);

		if (index === -1) {
			return reply.code(404).send({ erro: "Agendamento nao encontrado" });
		}

		agendamentos[index] = { ...agendamentos[index], ...updates, id };

		return agendamentos[index];
	});

	// Exclui um agendamento por id.
	app.delete("/agendamentos/:id", async (request, reply) => {
		const { id } = request.params;
		const index = agendamentos.findIndex((item) => item.id === id);

		if (index === -1) {
			return reply.code(404).send({ erro: "Agendamento nao encontrado" });
		}

		agendamentos.splice(index, 1);
		return reply.code(204).send();
	});
}

async function iniciarServidor() {
	try {
		await fastify.register(cors, {
			origin: true,
		});

		registrarRotas(fastify);
		const address = await fastify.listen({ port: PORT });
		fastify.log.info(`Servidor rodando em ${address}`);
	} catch (erro) {
		fastify.log.error(erro);
		process.exit(1);
	}
}

iniciarServidor();
