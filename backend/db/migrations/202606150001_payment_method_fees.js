exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.formas_pagamento
			ADD COLUMN IF NOT EXISTS taxa_percentual numeric(7,4) NOT NULL DEFAULT 0,
			ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 100;

		ALTER TABLE public.agendamentos
			ADD COLUMN IF NOT EXISTS taxa_pagamento_percentual numeric(7,4) NOT NULL DEFAULT 0,
			ADD COLUMN IF NOT EXISTS taxa_pagamento_valor numeric(10,2) NOT NULL DEFAULT 0,
			ADD COLUMN IF NOT EXISTS valor_liquido numeric(10,2) NOT NULL DEFAULT 0;

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'formas_pagamento_taxa_percentual_check'
			) THEN
				ALTER TABLE public.formas_pagamento
					ADD CONSTRAINT formas_pagamento_taxa_percentual_check
					CHECK (taxa_percentual >= 0 AND taxa_percentual <= 100);
			END IF;

			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'agendamentos_taxa_pagamento_percentual_check'
			) THEN
				ALTER TABLE public.agendamentos
					ADD CONSTRAINT agendamentos_taxa_pagamento_percentual_check
					CHECK (taxa_pagamento_percentual >= 0 AND taxa_pagamento_percentual <= 100);
			END IF;

			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'agendamentos_taxa_pagamento_valor_check'
			) THEN
				ALTER TABLE public.agendamentos
					ADD CONSTRAINT agendamentos_taxa_pagamento_valor_check
					CHECK (taxa_pagamento_valor >= 0);
			END IF;

			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'agendamentos_valor_liquido_check'
			) THEN
				ALTER TABLE public.agendamentos
					ADD CONSTRAINT agendamentos_valor_liquido_check
					CHECK (valor_liquido >= 0);
			END IF;
		END $$;

		INSERT INTO public.formas_pagamento (codigo, nome, taxa_percentual, ordem)
		VALUES
			('credito_parcelado', 'Credito parcelado', 0, 50)
		ON CONFLICT (codigo) DO UPDATE
		SET nome = EXCLUDED.nome;

		UPDATE public.formas_pagamento
		SET
			nome = CASE codigo
				WHEN 'cartao_debito' THEN 'Debito'
				WHEN 'cartao_credito' THEN 'Credito a vista'
				WHEN 'credito_parcelado' THEN 'Credito parcelado'
				ELSE nome
			END,
			ordem = CASE codigo
				WHEN 'pix' THEN 10
				WHEN 'dinheiro' THEN 20
				WHEN 'cartao_debito' THEN 30
				WHEN 'cartao_credito' THEN 40
				WHEN 'credito_parcelado' THEN 50
				WHEN 'fiado' THEN 60
				ELSE 100
			END
		WHERE codigo IN (
			'pix',
			'dinheiro',
			'cartao_debito',
			'cartao_credito',
			'credito_parcelado',
			'fiado',
			'outro'
		);

		UPDATE public.agendamentos
		SET valor_liquido = GREATEST(total - taxa_pagamento_valor, 0)
		WHERE valor_liquido = 0 AND total > 0;
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.agendamentos
			DROP CONSTRAINT IF EXISTS agendamentos_valor_liquido_check,
			DROP CONSTRAINT IF EXISTS agendamentos_taxa_pagamento_valor_check,
			DROP CONSTRAINT IF EXISTS agendamentos_taxa_pagamento_percentual_check,
			DROP COLUMN IF EXISTS valor_liquido,
			DROP COLUMN IF EXISTS taxa_pagamento_valor,
			DROP COLUMN IF EXISTS taxa_pagamento_percentual;

		ALTER TABLE public.formas_pagamento
			DROP CONSTRAINT IF EXISTS formas_pagamento_taxa_percentual_check,
			DROP COLUMN IF EXISTS ordem,
			DROP COLUMN IF EXISTS taxa_percentual;
	`);
};
