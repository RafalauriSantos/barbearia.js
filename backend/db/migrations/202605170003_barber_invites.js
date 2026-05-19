exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.barbeiros
		ADD COLUMN IF NOT EXISTS email varchar;

		CREATE TABLE IF NOT EXISTS public.convites_barbeiros (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			barbearia_id uuid NOT NULL REFERENCES public.barbearias (id) ON DELETE CASCADE,
			barbeiro_id uuid NOT NULL REFERENCES public.barbeiros (id) ON DELETE CASCADE,
			email varchar NOT NULL,
			token_hash varchar NOT NULL UNIQUE,
			expira_em timestamptz NOT NULL,
			aceito_em timestamptz,
			revogado_em timestamptz,
			criado_por_usuario_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
			criado_em timestamptz NOT NULL DEFAULT now()
		);

		CREATE INDEX IF NOT EXISTS idx_convites_barbeiros_barbearia
		ON public.convites_barbeiros (barbearia_id, criado_em);

		CREATE INDEX IF NOT EXISTS idx_convites_barbeiros_barbeiro_status
		ON public.convites_barbeiros (barbeiro_id, aceito_em, revogado_em, expira_em);
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		DROP INDEX IF EXISTS public.idx_convites_barbeiros_barbeiro_status;
		DROP INDEX IF EXISTS public.idx_convites_barbeiros_barbearia;
		DROP TABLE IF EXISTS public.convites_barbeiros;
		ALTER TABLE public.barbeiros DROP COLUMN IF EXISTS email;
	`);
};
