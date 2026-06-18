exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.produtos
			ADD COLUMN IF NOT EXISTS quantidade_estoque integer NOT NULL DEFAULT 0;

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'produtos_quantidade_estoque_check'
			) THEN
				ALTER TABLE public.produtos
					ADD CONSTRAINT produtos_quantidade_estoque_check
					CHECK (quantidade_estoque >= 0);
			END IF;
		END $$;
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.produtos
			DROP CONSTRAINT IF EXISTS produtos_quantidade_estoque_check,
			DROP COLUMN IF EXISTS quantidade_estoque;
	`);
};
