exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.agendamento_produtos
			ADD COLUMN IF NOT EXISTS tipo_compra varchar NOT NULL DEFAULT 'avista',
			ADD COLUMN IF NOT EXISTS custo_unitario numeric(10,2) NOT NULL DEFAULT 0,
			ADD COLUMN IF NOT EXISTS fornecedor varchar,
			ADD COLUMN IF NOT EXISTS comissao_venda_percentual numeric(7,4) NOT NULL DEFAULT 0;

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'agendamento_produtos_tipo_compra_check'
			) THEN
				ALTER TABLE public.agendamento_produtos
					ADD CONSTRAINT agendamento_produtos_tipo_compra_check
					CHECK (tipo_compra IN ('avista', 'consignado'));
			END IF;

			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'agendamento_produtos_custo_unitario_check'
			) THEN
				ALTER TABLE public.agendamento_produtos
					ADD CONSTRAINT agendamento_produtos_custo_unitario_check
					CHECK (custo_unitario >= 0);
			END IF;

			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'agendamento_produtos_comissao_venda_percentual_check'
			) THEN
				ALTER TABLE public.agendamento_produtos
					ADD CONSTRAINT agendamento_produtos_comissao_venda_percentual_check
					CHECK (
						comissao_venda_percentual >= 0
						AND comissao_venda_percentual <= 100
					);
			END IF;
		END $$;
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.agendamento_produtos
			DROP CONSTRAINT IF EXISTS agendamento_produtos_comissao_venda_percentual_check,
			DROP CONSTRAINT IF EXISTS agendamento_produtos_custo_unitario_check,
			DROP CONSTRAINT IF EXISTS agendamento_produtos_tipo_compra_check,
			DROP COLUMN IF EXISTS comissao_venda_percentual,
			DROP COLUMN IF EXISTS fornecedor,
			DROP COLUMN IF EXISTS custo_unitario,
			DROP COLUMN IF EXISTS tipo_compra;
	`);
};
