exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.barbeiros
		ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL;

		CREATE UNIQUE INDEX IF NOT EXISTS idx_barbeiros_usuario_unique
		ON public.barbeiros (usuario_id)
		WHERE usuario_id IS NOT NULL;

		CREATE INDEX IF NOT EXISTS idx_barbeiros_barbearia_usuario
		ON public.barbeiros (barbearia_id, usuario_id);
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		DROP INDEX IF EXISTS public.idx_barbeiros_barbearia_usuario;
		DROP INDEX IF EXISTS public.idx_barbeiros_usuario_unique;
		ALTER TABLE public.barbeiros DROP COLUMN IF EXISTS usuario_id;
	`);
};
