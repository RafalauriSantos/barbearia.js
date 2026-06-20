exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.clientes
			ADD COLUMN IF NOT EXISTS barbeiro_id uuid REFERENCES public.barbeiros(id) ON DELETE SET NULL;
		ALTER TABLE public.lista_espera
			ADD COLUMN IF NOT EXISTS barbeiro_id uuid REFERENCES public.barbeiros(id) ON DELETE SET NULL;
		ALTER TABLE public.agendamentos
			ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
			ADD COLUMN IF NOT EXISTS data_pagamento date;

		UPDATE public.clientes AS cliente
		SET barbeiro_id = (
			SELECT barbeiro.id
			FROM public.barbeiros AS barbeiro
			JOIN public.barbearias AS barbearia ON barbearia.id = cliente.barbearia_id
			WHERE barbeiro.barbearia_id = cliente.barbearia_id AND barbeiro.ativo = true
			ORDER BY (barbeiro.usuario_id = barbearia.usuario_dono_id) DESC, barbeiro.criado_em ASC
			LIMIT 1
		)
		WHERE cliente.barbeiro_id IS NULL;

		UPDATE public.lista_espera AS espera
		SET barbeiro_id = (
			SELECT barbeiro.id
			FROM public.barbeiros AS barbeiro
			JOIN public.barbearias AS barbearia ON barbearia.id = espera.barbearia_id
			WHERE barbeiro.barbearia_id = espera.barbearia_id AND barbeiro.ativo = true
			ORDER BY (barbeiro.usuario_id = barbearia.usuario_dono_id) DESC, barbeiro.criado_em ASC
			LIMIT 1
		)
		WHERE espera.barbeiro_id IS NULL;

		UPDATE public.agendamentos
		SET data_pagamento = data
		WHERE status_pagamento = 'pago' AND data_pagamento IS NULL;

		CREATE TABLE IF NOT EXISTS public.contas_receber (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			barbearia_id uuid NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
			barbeiro_id uuid REFERENCES public.barbeiros(id) ON DELETE SET NULL,
			cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
			agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE CASCADE,
			nome_cliente varchar NOT NULL,
			descricao varchar NOT NULL,
			observacoes text,
			valor numeric(10,2) NOT NULL CHECK (valor >= 0),
			data_divida date NOT NULL,
			hora_divida time,
			vencimento_em date,
			status varchar NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'cancelado')),
			forma_pagamento_id uuid REFERENCES public.formas_pagamento(id) ON DELETE SET NULL,
			taxa_pagamento_percentual numeric(7,4) NOT NULL DEFAULT 0,
			taxa_pagamento_valor numeric(10,2) NOT NULL DEFAULT 0,
			valor_liquido numeric(10,2) NOT NULL DEFAULT 0,
			data_pagamento date,
			criado_por_usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
			criado_em timestamptz NOT NULL DEFAULT now(),
			atualizado_em timestamptz NOT NULL DEFAULT now()
		);

		CREATE UNIQUE INDEX IF NOT EXISTS idx_contas_receber_agendamento_unique
			ON public.contas_receber(agendamento_id);
		CREATE INDEX IF NOT EXISTS idx_contas_receber_loja_status_data
			ON public.contas_receber(barbearia_id, status, data_divida DESC);
		CREATE INDEX IF NOT EXISTS idx_contas_receber_barbeiro_status
			ON public.contas_receber(barbeiro_id, status);
		CREATE INDEX IF NOT EXISTS idx_clientes_barbeiro_ativo
			ON public.clientes(barbeiro_id, ativo);
		CREATE INDEX IF NOT EXISTS idx_lista_espera_barbeiro_status
			ON public.lista_espera(barbeiro_id, status);
		CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente
			ON public.agendamentos(cliente_id);
		CREATE INDEX IF NOT EXISTS idx_agendamentos_pagamento_data
			ON public.agendamentos(barbearia_id, data_pagamento);

		INSERT INTO public.contas_receber (
			barbearia_id, barbeiro_id, cliente_id, agendamento_id, nome_cliente,
			descricao, observacoes, valor, data_divida, hora_divida, vencimento_em, status
		)
		SELECT
			agendamento.barbearia_id, agendamento.barbeiro_id, agendamento.cliente_id,
			agendamento.id, agendamento.cliente_nome, 'Fiado do atendimento',
			agendamento.observacoes,
			COALESCE(agendamento.total, agendamento.valor_manual, 0),
			agendamento.data, agendamento.hora, agendamento.prazo_fiado_data, 'aberto'
		FROM public.agendamentos AS agendamento
		WHERE agendamento.status_pagamento = 'fiado'
		ON CONFLICT (agendamento_id) DO NOTHING;

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_trigger WHERE tgname = 'trg_contas_receber_atualizado_em'
			) THEN
				CREATE TRIGGER trg_contas_receber_atualizado_em
					BEFORE UPDATE ON public.contas_receber
					FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
			END IF;
		END $$;
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		DROP TABLE IF EXISTS public.contas_receber;
		DROP INDEX IF EXISTS public.idx_agendamentos_pagamento_data;
		DROP INDEX IF EXISTS public.idx_agendamentos_cliente;
		DROP INDEX IF EXISTS public.idx_lista_espera_barbeiro_status;
		DROP INDEX IF EXISTS public.idx_clientes_barbeiro_ativo;
		ALTER TABLE public.agendamentos DROP COLUMN IF EXISTS data_pagamento;
		ALTER TABLE public.agendamentos DROP COLUMN IF EXISTS cliente_id;
		ALTER TABLE public.lista_espera DROP COLUMN IF EXISTS barbeiro_id;
		ALTER TABLE public.clientes DROP COLUMN IF EXISTS barbeiro_id;
	`);
};
