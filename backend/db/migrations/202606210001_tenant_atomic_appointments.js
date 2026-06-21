exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.formas_pagamento
			ADD COLUMN IF NOT EXISTS barbearia_id uuid REFERENCES public.barbearias(id) ON DELETE CASCADE;
		ALTER TABLE public.formas_pagamento
			DROP CONSTRAINT IF EXISTS formas_pagamento_codigo_key;

		CREATE TEMP TABLE payment_method_tenant_map (
			old_id uuid NOT NULL,
			barbearia_id uuid NOT NULL,
			new_id uuid NOT NULL,
			PRIMARY KEY (old_id, barbearia_id)
		) ON COMMIT DROP;

		INSERT INTO payment_method_tenant_map (old_id, barbearia_id, new_id)
		SELECT
			method.id,
			shop.id,
			CASE
				WHEN ROW_NUMBER() OVER (PARTITION BY method.id ORDER BY shop.id) = 1
					THEN method.id
				ELSE gen_random_uuid()
			END
		FROM public.formas_pagamento AS method
		CROSS JOIN public.barbearias AS shop
		WHERE method.barbearia_id IS NULL;

		UPDATE public.formas_pagamento AS method
		SET barbearia_id = tenant.barbearia_id
		FROM payment_method_tenant_map AS tenant
		WHERE tenant.old_id = method.id AND tenant.new_id = method.id;

		INSERT INTO public.formas_pagamento (
			id, barbearia_id, codigo, nome, taxa_percentual, ativo, ordem, criado_em
		)
		SELECT
			tenant.new_id, tenant.barbearia_id, method.codigo, method.nome,
			method.taxa_percentual, method.ativo, method.ordem, method.criado_em
		FROM payment_method_tenant_map AS tenant
		JOIN public.formas_pagamento AS method ON method.id = tenant.old_id
		WHERE tenant.new_id <> tenant.old_id
		ON CONFLICT (id) DO NOTHING;

		UPDATE public.agendamentos AS appointment
		SET forma_pagamento_id = tenant.new_id
		FROM payment_method_tenant_map AS tenant
		WHERE appointment.forma_pagamento_id = tenant.old_id
			AND appointment.barbearia_id = tenant.barbearia_id
			AND appointment.forma_pagamento_id <> tenant.new_id;

		UPDATE public.contas_receber AS receivable
		SET forma_pagamento_id = tenant.new_id
		FROM payment_method_tenant_map AS tenant
		WHERE receivable.forma_pagamento_id = tenant.old_id
			AND receivable.barbearia_id = tenant.barbearia_id
			AND receivable.forma_pagamento_id <> tenant.new_id;

		DELETE FROM public.formas_pagamento AS method
		WHERE method.barbearia_id IS NULL
			AND NOT EXISTS (
				SELECT 1 FROM public.agendamentos WHERE forma_pagamento_id = method.id
			)
			AND NOT EXISTS (
				SELECT 1 FROM public.contas_receber WHERE forma_pagamento_id = method.id
			);

		ALTER TABLE public.formas_pagamento
			ALTER COLUMN barbearia_id SET NOT NULL;
		ALTER TABLE public.formas_pagamento
			ADD CONSTRAINT formas_pagamento_loja_codigo_unique
			UNIQUE (barbearia_id, codigo);
		ALTER TABLE public.formas_pagamento
			ADD CONSTRAINT formas_pagamento_id_loja_unique
			UNIQUE (id, barbearia_id);

		ALTER TABLE public.agendamentos
			DROP CONSTRAINT IF EXISTS agendamentos_forma_pagamento_id_fkey;
		ALTER TABLE public.agendamentos
			ADD CONSTRAINT agendamentos_forma_pagamento_loja_fkey
			FOREIGN KEY (forma_pagamento_id, barbearia_id)
			REFERENCES public.formas_pagamento(id, barbearia_id) ON DELETE RESTRICT;

		ALTER TABLE public.contas_receber
			DROP CONSTRAINT IF EXISTS contas_receber_forma_pagamento_id_fkey;
		ALTER TABLE public.contas_receber
			ADD CONSTRAINT contas_receber_forma_pagamento_loja_fkey
			FOREIGN KEY (forma_pagamento_id, barbearia_id)
			REFERENCES public.formas_pagamento(id, barbearia_id) ON DELETE RESTRICT;

		CREATE OR REPLACE FUNCTION public.criar_formas_pagamento_padrao()
		RETURNS trigger AS $$
		BEGIN
			INSERT INTO public.formas_pagamento (
				barbearia_id, codigo, nome, taxa_percentual, ativo, ordem
			) VALUES
				(NEW.id, 'pix', 'Pix', 0, true, 10),
				(NEW.id, 'dinheiro', 'Dinheiro', 0, true, 20),
				(NEW.id, 'cartao_debito', 'Cartao de debito', 0, true, 30),
				(NEW.id, 'cartao_credito', 'Cartao de credito', 0, true, 40),
				(NEW.id, 'credito_parcelado', 'Credito parcelado', 0, true, 50),
				(NEW.id, 'fiado', 'Fiado', 0, true, 60),
				(NEW.id, 'outro', 'Outro', 0, true, 100)
			ON CONFLICT (barbearia_id, codigo) DO NOTHING;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;

		DROP TRIGGER IF EXISTS trg_barbearias_formas_pagamento_padrao ON public.barbearias;
		CREATE TRIGGER trg_barbearias_formas_pagamento_padrao
			AFTER INSERT ON public.barbearias
			FOR EACH ROW EXECUTE FUNCTION public.criar_formas_pagamento_padrao();

		ALTER TABLE public.agendamentos
			ADD CONSTRAINT agendamentos_id_loja_unique UNIQUE (id, barbearia_id);
		ALTER TABLE public.servicos
			ADD CONSTRAINT servicos_id_loja_unique UNIQUE (id, barbearia_id);
		ALTER TABLE public.produtos
			ADD CONSTRAINT produtos_id_loja_unique UNIQUE (id, barbearia_id);

		ALTER TABLE public.agendamento_servicos
			ADD COLUMN IF NOT EXISTS barbearia_id uuid;
		ALTER TABLE public.agendamento_produtos
			ADD COLUMN IF NOT EXISTS barbearia_id uuid;

		UPDATE public.agendamento_servicos AS item
		SET barbearia_id = appointment.barbearia_id
		FROM public.agendamentos AS appointment
		WHERE appointment.id = item.agendamento_id AND item.barbearia_id IS NULL;
		UPDATE public.agendamento_produtos AS item
		SET barbearia_id = appointment.barbearia_id
		FROM public.agendamentos AS appointment
		WHERE appointment.id = item.agendamento_id AND item.barbearia_id IS NULL;

		ALTER TABLE public.agendamento_servicos ALTER COLUMN barbearia_id SET NOT NULL;
		ALTER TABLE public.agendamento_produtos ALTER COLUMN barbearia_id SET NOT NULL;

		ALTER TABLE public.agendamento_servicos
			DROP CONSTRAINT IF EXISTS agendamento_servicos_agendamento_id_fkey,
			DROP CONSTRAINT IF EXISTS agendamento_servicos_servico_id_fkey;
		ALTER TABLE public.agendamento_servicos
			ADD CONSTRAINT agendamento_servicos_agendamento_loja_fkey
			FOREIGN KEY (agendamento_id, barbearia_id)
			REFERENCES public.agendamentos(id, barbearia_id) ON DELETE CASCADE,
			ADD CONSTRAINT agendamento_servicos_catalogo_loja_fkey
			FOREIGN KEY (servico_id, barbearia_id)
			REFERENCES public.servicos(id, barbearia_id) ON DELETE RESTRICT;

		ALTER TABLE public.agendamento_produtos
			DROP CONSTRAINT IF EXISTS agendamento_produtos_agendamento_id_fkey,
			DROP CONSTRAINT IF EXISTS agendamento_produtos_produto_id_fkey;
		ALTER TABLE public.agendamento_produtos
			ADD CONSTRAINT agendamento_produtos_agendamento_loja_fkey
			FOREIGN KEY (agendamento_id, barbearia_id)
			REFERENCES public.agendamentos(id, barbearia_id) ON DELETE CASCADE,
			ADD CONSTRAINT agendamento_produtos_catalogo_loja_fkey
			FOREIGN KEY (produto_id, barbearia_id)
			REFERENCES public.produtos(id, barbearia_id) ON DELETE RESTRICT;

		CREATE OR REPLACE FUNCTION public.salvar_agendamento_atomico(
			p_agendamento jsonb,
			p_servicos jsonb DEFAULT NULL,
			p_produtos jsonb DEFAULT NULL,
			p_usuario_id uuid DEFAULT NULL
		) RETURNS uuid AS $$
		DECLARE
			v_id uuid := COALESCE((p_agendamento->>'id')::uuid, gen_random_uuid());
			v_barbearia_id uuid := (p_agendamento->>'barbearia_id')::uuid;
			v_exists boolean;
			v_status varchar;
		BEGIN
			IF v_barbearia_id IS NULL THEN
				RAISE EXCEPTION 'BARBEARIA_CONTEXT_REQUIRED';
			END IF;

			SELECT EXISTS (
				SELECT 1 FROM public.agendamentos
				WHERE id = v_id AND barbearia_id = v_barbearia_id
				FOR UPDATE
			) INTO v_exists;

			IF v_exists THEN
				UPDATE public.agendamentos SET
					barbeiro_id = CASE WHEN jsonb_exists(p_agendamento, 'barbeiro_id') THEN (p_agendamento->>'barbeiro_id')::uuid ELSE barbeiro_id END,
					cliente_id = CASE WHEN jsonb_exists(p_agendamento, 'cliente_id') THEN NULLIF(p_agendamento->>'cliente_id', '')::uuid ELSE cliente_id END,
					cliente_nome = CASE WHEN jsonb_exists(p_agendamento, 'cliente_nome') THEN p_agendamento->>'cliente_nome' ELSE cliente_nome END,
					data = CASE WHEN jsonb_exists(p_agendamento, 'data') THEN (p_agendamento->>'data')::date ELSE data END,
					hora = CASE WHEN jsonb_exists(p_agendamento, 'hora') THEN (p_agendamento->>'hora')::time ELSE hora END,
					valor_manual = CASE WHEN jsonb_exists(p_agendamento, 'valor_manual') THEN (p_agendamento->>'valor_manual')::numeric ELSE valor_manual END,
					total = CASE WHEN jsonb_exists(p_agendamento, 'total') THEN (p_agendamento->>'total')::numeric ELSE total END,
					status_pagamento = CASE WHEN jsonb_exists(p_agendamento, 'status_pagamento') THEN p_agendamento->>'status_pagamento' ELSE status_pagamento END,
					forma_pagamento_id = CASE WHEN jsonb_exists(p_agendamento, 'forma_pagamento_id') THEN NULLIF(p_agendamento->>'forma_pagamento_id', '')::uuid ELSE forma_pagamento_id END,
					taxa_pagamento_percentual = CASE WHEN jsonb_exists(p_agendamento, 'taxa_pagamento_percentual') THEN (p_agendamento->>'taxa_pagamento_percentual')::numeric ELSE taxa_pagamento_percentual END,
					taxa_pagamento_valor = CASE WHEN jsonb_exists(p_agendamento, 'taxa_pagamento_valor') THEN (p_agendamento->>'taxa_pagamento_valor')::numeric ELSE taxa_pagamento_valor END,
					valor_liquido = CASE WHEN jsonb_exists(p_agendamento, 'valor_liquido') THEN (p_agendamento->>'valor_liquido')::numeric ELSE valor_liquido END,
					prazo_fiado_data = CASE WHEN jsonb_exists(p_agendamento, 'prazo_fiado_data') THEN NULLIF(p_agendamento->>'prazo_fiado_data', '')::date ELSE prazo_fiado_data END,
					data_pagamento = CASE WHEN jsonb_exists(p_agendamento, 'data_pagamento') THEN NULLIF(p_agendamento->>'data_pagamento', '')::date ELSE data_pagamento END,
					observacoes = CASE WHEN jsonb_exists(p_agendamento, 'observacoes') THEN NULLIF(p_agendamento->>'observacoes', '') ELSE observacoes END
				WHERE id = v_id AND barbearia_id = v_barbearia_id;
			ELSE
				INSERT INTO public.agendamentos (
					id, barbearia_id, barbeiro_id, cliente_id, cliente_nome, data, hora,
					valor_manual, total, status_atendimento, status_pagamento,
					forma_pagamento_id, taxa_pagamento_percentual, taxa_pagamento_valor,
					valor_liquido, prazo_fiado_data, data_pagamento, observacoes
				) VALUES (
					v_id, v_barbearia_id, (p_agendamento->>'barbeiro_id')::uuid,
					NULLIF(p_agendamento->>'cliente_id', '')::uuid,
					p_agendamento->>'cliente_nome', (p_agendamento->>'data')::date,
					(p_agendamento->>'hora')::time,
					COALESCE((p_agendamento->>'valor_manual')::numeric, 0),
					COALESCE((p_agendamento->>'total')::numeric, 0), 'agendado',
					COALESCE(p_agendamento->>'status_pagamento', 'pendente'),
					NULLIF(p_agendamento->>'forma_pagamento_id', '')::uuid,
					COALESCE((p_agendamento->>'taxa_pagamento_percentual')::numeric, 0),
					COALESCE((p_agendamento->>'taxa_pagamento_valor')::numeric, 0),
					COALESCE((p_agendamento->>'valor_liquido')::numeric, (p_agendamento->>'total')::numeric, 0),
					NULLIF(p_agendamento->>'prazo_fiado_data', '')::date,
					NULLIF(p_agendamento->>'data_pagamento', '')::date,
					NULLIF(p_agendamento->>'observacoes', '')
				);
			END IF;

			IF p_servicos IS NOT NULL THEN
				IF EXISTS (
					SELECT 1
					FROM jsonb_to_recordset(p_servicos) AS requested(id uuid, quantity integer)
					LEFT JOIN public.servicos AS service
						ON service.id = requested.id
						AND service.barbearia_id = v_barbearia_id
						AND service.ativo = true
					WHERE service.id IS NULL
				) THEN RAISE EXCEPTION 'CATALOG_ITEM_INVALID'; END IF;

				DELETE FROM public.agendamento_servicos WHERE agendamento_id = v_id;
				INSERT INTO public.agendamento_servicos (
					agendamento_id, barbearia_id, servico_id, nome_servico,
					preco_unitario, quantidade, subtotal
				)
				SELECT v_id, v_barbearia_id, service.id, service.nome, service.preco,
					requested.quantity, service.preco * requested.quantity
				FROM (
					SELECT id, SUM(GREATEST(quantity, 1))::integer AS quantity
					FROM jsonb_to_recordset(p_servicos) AS rows(id uuid, quantity integer)
					GROUP BY id
				) AS requested
				JOIN public.servicos AS service
					ON service.id = requested.id AND service.barbearia_id = v_barbearia_id;
			END IF;

			IF p_produtos IS NOT NULL THEN
				UPDATE public.produtos AS product
				SET quantidade_estoque = product.quantidade_estoque + previous.quantity
				FROM (
					SELECT produto_id, SUM(quantidade)::integer AS quantity
					FROM public.agendamento_produtos
					WHERE agendamento_id = v_id
					GROUP BY produto_id
				) AS previous
				WHERE product.id = previous.produto_id AND product.barbearia_id = v_barbearia_id;

				DELETE FROM public.agendamento_produtos WHERE agendamento_id = v_id;

				IF EXISTS (
					SELECT 1
					FROM jsonb_to_recordset(p_produtos) AS requested(id uuid, quantity integer)
					LEFT JOIN public.produtos AS product
						ON product.id = requested.id
						AND product.barbearia_id = v_barbearia_id
						AND product.ativo = true
					WHERE product.id IS NULL
				) THEN RAISE EXCEPTION 'CATALOG_ITEM_INVALID'; END IF;

				PERFORM product.id
				FROM public.produtos AS product
				JOIN jsonb_to_recordset(p_produtos) AS requested(id uuid, quantity integer)
					ON requested.id = product.id
				WHERE product.barbearia_id = v_barbearia_id
				FOR UPDATE;

				IF EXISTS (
					SELECT 1
					FROM (
						SELECT id, SUM(GREATEST(quantity, 1))::integer AS quantity
						FROM jsonb_to_recordset(p_produtos) AS rows(id uuid, quantity integer)
						GROUP BY id
					) AS requested
					JOIN public.produtos AS product
						ON product.id = requested.id AND product.barbearia_id = v_barbearia_id
					WHERE product.quantidade_estoque < requested.quantity
				) THEN RAISE EXCEPTION 'PRODUCT_STOCK_INSUFFICIENT'; END IF;

				UPDATE public.produtos AS product
				SET quantidade_estoque = product.quantidade_estoque - requested.quantity
				FROM (
					SELECT id, SUM(GREATEST(quantity, 1))::integer AS quantity
					FROM jsonb_to_recordset(p_produtos) AS rows(id uuid, quantity integer)
					GROUP BY id
				) AS requested
				WHERE product.id = requested.id AND product.barbearia_id = v_barbearia_id;

				INSERT INTO public.agendamento_produtos (
					agendamento_id, barbearia_id, produto_id, nome_produto, preco_unitario,
					quantidade, subtotal, tipo_compra, custo_unitario, fornecedor,
					comissao_venda_percentual
				)
				SELECT v_id, v_barbearia_id, product.id, product.nome, product.preco,
					requested.quantity, product.preco * requested.quantity,
					product.tipo_compra, product.custo, product.fornecedor,
					product.comissao_venda_percentual
				FROM (
					SELECT id, SUM(GREATEST(quantity, 1))::integer AS quantity
					FROM jsonb_to_recordset(p_produtos) AS rows(id uuid, quantity integer)
					GROUP BY id
				) AS requested
				JOIN public.produtos AS product
					ON product.id = requested.id AND product.barbearia_id = v_barbearia_id;
			END IF;

			SELECT status_pagamento INTO v_status
			FROM public.agendamentos WHERE id = v_id;

			IF v_status = 'fiado' THEN
				INSERT INTO public.contas_receber (
					barbearia_id, barbeiro_id, cliente_id, agendamento_id, nome_cliente,
					descricao, observacoes, valor, data_divida, hora_divida,
					vencimento_em, status, forma_pagamento_id, taxa_pagamento_percentual,
					taxa_pagamento_valor, valor_liquido, data_pagamento,
					criado_por_usuario_id
				)
				SELECT barbearia_id, barbeiro_id, cliente_id, id, cliente_nome,
					'Fiado do atendimento', observacoes, total, data, hora,
					prazo_fiado_data, 'aberto', NULL, 0, 0, 0, NULL, p_usuario_id
				FROM public.agendamentos WHERE id = v_id
				ON CONFLICT (agendamento_id) DO UPDATE SET
					barbeiro_id = EXCLUDED.barbeiro_id,
					cliente_id = EXCLUDED.cliente_id,
					nome_cliente = EXCLUDED.nome_cliente,
					observacoes = EXCLUDED.observacoes,
					valor = EXCLUDED.valor,
					data_divida = EXCLUDED.data_divida,
					hora_divida = EXCLUDED.hora_divida,
					vencimento_em = EXCLUDED.vencimento_em,
					status = 'aberto', forma_pagamento_id = NULL,
					taxa_pagamento_percentual = 0, taxa_pagamento_valor = 0,
					valor_liquido = 0, data_pagamento = NULL;
			ELSIF v_status = 'pago' THEN
				UPDATE public.contas_receber AS receivable SET
					status = 'pago',
					forma_pagamento_id = appointment.forma_pagamento_id,
					taxa_pagamento_percentual = appointment.taxa_pagamento_percentual,
					taxa_pagamento_valor = appointment.taxa_pagamento_valor,
					valor_liquido = appointment.valor_liquido,
					data_pagamento = appointment.data_pagamento
				FROM public.agendamentos AS appointment
				WHERE receivable.agendamento_id = appointment.id AND appointment.id = v_id;
			ELSE
				UPDATE public.contas_receber SET status = 'cancelado'
				WHERE agendamento_id = v_id AND status = 'aberto';
			END IF;

			IF v_status = 'pago' THEN
				INSERT INTO public.contas_pagar_fornecedores (
					barbearia_id, barbeiro_id, agendamento_id, produto_id, origem_chave,
					fornecedor, descricao, valor, data_origem, status
				)
				SELECT appointment.barbearia_id, appointment.barbeiro_id, appointment.id,
					item.produto_id,
					CONCAT('agendamento:', appointment.id, ':produto:', item.produto_id),
					COALESCE(NULLIF(item.fornecedor, ''), 'Sem fornecedor'),
					CONCAT(item.nome_produto, ' - ', item.quantidade, ' un.'),
					item.custo_unitario * item.quantidade, appointment.data, 'aberto'
				FROM public.agendamentos AS appointment
				JOIN public.agendamento_produtos AS item ON item.agendamento_id = appointment.id
				WHERE appointment.id = v_id AND item.tipo_compra = 'consignado'
					AND item.custo_unitario > 0
				ON CONFLICT (origem_chave) DO UPDATE SET
					barbearia_id = EXCLUDED.barbearia_id,
					barbeiro_id = EXCLUDED.barbeiro_id,
					agendamento_id = EXCLUDED.agendamento_id,
					produto_id = EXCLUDED.produto_id,
					fornecedor = EXCLUDED.fornecedor,
					descricao = EXCLUDED.descricao,
					valor = EXCLUDED.valor,
					data_origem = EXCLUDED.data_origem,
					status = CASE
						WHEN public.contas_pagar_fornecedores.status = 'pago' THEN 'pago'
						ELSE 'aberto'
					END;
			END IF;

			UPDATE public.contas_pagar_fornecedores AS payable SET status = 'cancelado'
			WHERE payable.agendamento_id = v_id AND payable.status = 'aberto'
				AND (
					v_status <> 'pago' OR NOT EXISTS (
						SELECT 1 FROM public.agendamento_produtos AS item
						WHERE item.agendamento_id = v_id
							AND item.produto_id = payable.produto_id
							AND item.tipo_compra = 'consignado'
							AND item.custo_unitario > 0
					)
				);

			RETURN v_id;
		END;
		$$ LANGUAGE plpgsql;

		CREATE OR REPLACE FUNCTION public.excluir_agendamento_atomico(
			p_agendamento_id uuid,
			p_barbearia_id uuid
		) RETURNS boolean AS $$
		BEGIN
			PERFORM id FROM public.agendamentos
			WHERE id = p_agendamento_id AND barbearia_id = p_barbearia_id
			FOR UPDATE;
			IF NOT FOUND THEN RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND'; END IF;

			UPDATE public.produtos AS product
			SET quantidade_estoque = product.quantidade_estoque + previous.quantity
			FROM (
				SELECT produto_id, SUM(quantidade)::integer AS quantity
				FROM public.agendamento_produtos
				WHERE agendamento_id = p_agendamento_id
				GROUP BY produto_id
			) AS previous
			WHERE product.id = previous.produto_id AND product.barbearia_id = p_barbearia_id;

			UPDATE public.contas_pagar_fornecedores
			SET status = 'cancelado'
			WHERE agendamento_id = p_agendamento_id AND status = 'aberto';

			DELETE FROM public.agendamentos
			WHERE id = p_agendamento_id AND barbearia_id = p_barbearia_id;
			RETURN true;
		END;
		$$ LANGUAGE plpgsql;
	`);
};

exports.down = async function () {
	throw new Error(
		"Rollback disabled: this migration rewires tenant-owned financial history.",
	);
};
