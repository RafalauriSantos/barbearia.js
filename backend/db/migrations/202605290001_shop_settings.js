exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.barbearias
			ADD COLUMN IF NOT EXISTS telefone varchar,
			ADD COLUMN IF NOT EXISTS endereco text,
			ADD COLUMN IF NOT EXISTS horario_abertura time,
			ADD COLUMN IF NOT EXISTS horario_fechamento time,
			ADD COLUMN IF NOT EXISTS duracao_atendimento_min integer NOT NULL DEFAULT 30,
			ADD COLUMN IF NOT EXISTS intervalo_agenda_min integer NOT NULL DEFAULT 30;

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'barbearias_duracao_atendimento_min_check'
			) THEN
				ALTER TABLE public.barbearias
					ADD CONSTRAINT barbearias_duracao_atendimento_min_check
					CHECK (duracao_atendimento_min >= 5 AND duracao_atendimento_min <= 480);
			END IF;

			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint
				WHERE conname = 'barbearias_intervalo_agenda_min_check'
			) THEN
				ALTER TABLE public.barbearias
					ADD CONSTRAINT barbearias_intervalo_agenda_min_check
					CHECK (intervalo_agenda_min >= 5 AND intervalo_agenda_min <= 240);
			END IF;
		END $$;
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.barbearias
			DROP CONSTRAINT IF EXISTS barbearias_intervalo_agenda_min_check,
			DROP CONSTRAINT IF EXISTS barbearias_duracao_atendimento_min_check,
			DROP COLUMN IF EXISTS intervalo_agenda_min,
			DROP COLUMN IF EXISTS duracao_atendimento_min,
			DROP COLUMN IF EXISTS horario_fechamento,
			DROP COLUMN IF EXISTS horario_abertura,
			DROP COLUMN IF EXISTS endereco,
			DROP COLUMN IF EXISTS telefone;
	`);
};
