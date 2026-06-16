exports.up = async function (knex) {
	await knex.raw(`
		CREATE TABLE IF NOT EXISTS public.clientes (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			barbearia_id uuid NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
			nome varchar NOT NULL,
			telefone varchar,
			observacoes text,
			ativo boolean NOT NULL DEFAULT true,
			intervalo_dias integer NOT NULL DEFAULT 15 CHECK (intervalo_dias > 0),
			pacote_total_cortes integer NOT NULL DEFAULT 4 CHECK (pacote_total_cortes >= 0),
			criado_em timestamptz NOT NULL DEFAULT now(),
			atualizado_em timestamptz NOT NULL DEFAULT now()
		);

		CREATE TABLE IF NOT EXISTS public.cliente_cortes (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
			barbearia_id uuid NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
			data date NOT NULL,
			pago boolean NOT NULL DEFAULT false,
			valor numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
			observacoes text,
			criado_em timestamptz NOT NULL DEFAULT now()
		);

		CREATE TABLE IF NOT EXISTS public.lista_espera (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			barbearia_id uuid NOT NULL REFERENCES public.barbearias(id) ON DELETE CASCADE,
			nome varchar NOT NULL,
			telefone varchar,
			preferencia varchar,
			observacoes text,
			status varchar NOT NULL DEFAULT 'aguardando' CHECK (
				status IN ('aguardando', 'agendado', 'cancelado')
			),
			criado_em timestamptz NOT NULL DEFAULT now(),
			atualizado_em timestamptz NOT NULL DEFAULT now()
		);

		CREATE INDEX IF NOT EXISTS idx_clientes_barbearia_ativo
			ON public.clientes(barbearia_id, ativo);
		CREATE INDEX IF NOT EXISTS idx_cliente_cortes_cliente_data
			ON public.cliente_cortes(cliente_id, data DESC);
		CREATE INDEX IF NOT EXISTS idx_cliente_cortes_barbearia_data
			ON public.cliente_cortes(barbearia_id, data DESC);
		CREATE INDEX IF NOT EXISTS idx_lista_espera_barbearia_status
			ON public.lista_espera(barbearia_id, status);

		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clientes_atualizado_em'
			) THEN
				CREATE TRIGGER trg_clientes_atualizado_em
				BEFORE UPDATE ON public.clientes
				FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
			END IF;

			IF NOT EXISTS (
				SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lista_espera_atualizado_em'
			) THEN
				CREATE TRIGGER trg_lista_espera_atualizado_em
				BEFORE UPDATE ON public.lista_espera
				FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
			END IF;
		END $$;
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		DROP TABLE IF EXISTS public.cliente_cortes;
		DROP TABLE IF EXISTS public.lista_espera;
		DROP TABLE IF EXISTS public.clientes;
	`);
};
