exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.cliente_cortes
			ADD COLUMN IF NOT EXISTS agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL;

		CREATE UNIQUE INDEX IF NOT EXISTS idx_cliente_cortes_agendamento_unique
			ON public.cliente_cortes(agendamento_id)
			WHERE agendamento_id IS NOT NULL;

		CREATE TABLE IF NOT EXISTS public.contas_pagar_fornecedores (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			barbearia_id uuid NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
			barbeiro_id uuid REFERENCES public.barbeiros(id) ON DELETE SET NULL,
			agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL,
			produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
			origem_chave varchar NOT NULL UNIQUE,
			fornecedor varchar NOT NULL,
			descricao varchar NOT NULL,
			valor numeric(10,2) NOT NULL CHECK (valor >= 0),
			data_origem date NOT NULL,
			status varchar NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'pago', 'cancelado')),
			data_pagamento date,
			despesa_id uuid REFERENCES public.despesas(id) ON DELETE SET NULL,
			criado_em timestamptz NOT NULL DEFAULT now(),
			atualizado_em timestamptz NOT NULL DEFAULT now()
		);

		ALTER TABLE public.despesas
			ADD COLUMN IF NOT EXISTS conta_fornecedor_id uuid
				REFERENCES public.contas_pagar_fornecedores(id) ON DELETE SET NULL;

		CREATE UNIQUE INDEX IF NOT EXISTS idx_despesas_conta_fornecedor_unique
			ON public.despesas(conta_fornecedor_id)
			WHERE conta_fornecedor_id IS NOT NULL;
		CREATE INDEX IF NOT EXISTS idx_contas_pagar_fornecedor_loja_status_data
			ON public.contas_pagar_fornecedores(barbearia_id, status, data_origem DESC);

		INSERT INTO public.contas_pagar_fornecedores (
			barbearia_id, barbeiro_id, agendamento_id, produto_id, origem_chave,
			fornecedor, descricao, valor, data_origem, status
		)
		SELECT
			agendamento.barbearia_id,
			agendamento.barbeiro_id,
			agendamento.id,
			item.produto_id,
			CONCAT('agendamento:', agendamento.id, ':produto:', item.produto_id),
			COALESCE(NULLIF(item.fornecedor, ''), 'Sem fornecedor'),
			CONCAT(item.nome_produto, ' - ', item.quantidade, ' un.'),
			item.custo_unitario * item.quantidade,
			agendamento.data,
			'aberto'
		FROM public.agendamentos AS agendamento
		JOIN public.agendamento_produtos AS item ON item.agendamento_id = agendamento.id
		WHERE agendamento.status_pagamento = 'pago'
			AND item.tipo_compra = 'consignado'
			AND item.custo_unitario > 0
		ON CONFLICT (origem_chave) DO NOTHING;

		CREATE OR REPLACE FUNCTION public.baixar_conta_fornecedor(
			p_conta_id uuid,
			p_barbearia_id uuid,
			p_data_pagamento date
		) RETURNS uuid AS $$
		DECLARE
			conta public.contas_pagar_fornecedores%ROWTYPE;
			nova_despesa_id uuid;
		BEGIN
			SELECT * INTO conta
			FROM public.contas_pagar_fornecedores
			WHERE id = p_conta_id AND barbearia_id = p_barbearia_id
			FOR UPDATE;

			IF NOT FOUND THEN
				RAISE EXCEPTION 'SUPPLIER_PAYABLE_NOT_FOUND';
			END IF;

			IF conta.status = 'pago' THEN
				RETURN conta.despesa_id;
			END IF;

			IF conta.status <> 'aberto' THEN
				RAISE EXCEPTION 'SUPPLIER_PAYABLE_CLOSED';
			END IF;

			INSERT INTO public.despesas (
				barbearia_id, descricao, valor, data, conta_fornecedor_id
			) VALUES (
				conta.barbearia_id,
				CONCAT('Fornecedor ', conta.fornecedor, ': ', conta.descricao),
				conta.valor,
				p_data_pagamento,
				conta.id
			) RETURNING id INTO nova_despesa_id;

			UPDATE public.contas_pagar_fornecedores
			SET status = 'pago',
				data_pagamento = p_data_pagamento,
				despesa_id = nova_despesa_id
			WHERE id = conta.id;

			RETURN nova_despesa_id;
		END;
		$$ LANGUAGE plpgsql;

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_trigger
				WHERE tgname = 'trg_contas_pagar_fornecedores_atualizado_em'
			) THEN
				CREATE TRIGGER trg_contas_pagar_fornecedores_atualizado_em
					BEFORE UPDATE ON public.contas_pagar_fornecedores
					FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
			END IF;
		END $$;
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		DROP FUNCTION IF EXISTS public.baixar_conta_fornecedor(uuid, uuid, date);
		DROP INDEX IF EXISTS public.idx_despesas_conta_fornecedor_unique;
		ALTER TABLE public.despesas DROP COLUMN IF EXISTS conta_fornecedor_id;
		DROP TABLE IF EXISTS public.contas_pagar_fornecedores;
		DROP INDEX IF EXISTS public.idx_cliente_cortes_agendamento_unique;
		ALTER TABLE public.cliente_cortes DROP COLUMN IF EXISTS agendamento_id;
	`);
};
