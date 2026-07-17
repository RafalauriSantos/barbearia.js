exports.up = async function (knex) {
	await knex.raw(`
		-- Block 4: Session token version
		ALTER TABLE public.usuarios 
		ADD COLUMN IF NOT EXISTS token_version integer DEFAULT 1;

		-- Block 5a: Attempts counter for OTP codes
		ALTER TABLE public.email_verification_codes 
		ADD COLUMN IF NOT EXISTS attempts_count integer DEFAULT 0;

		ALTER TABLE public.password_reset_codes 
		ADD COLUMN IF NOT EXISTS attempts_count integer DEFAULT 0;

		-- Atomic increment procedures
		CREATE OR REPLACE FUNCTION public.incrementar_tentativas_codigo_verificacao(p_id uuid)
		RETURNS int AS $$
		DECLARE
			v_attempts int;
		BEGIN
			UPDATE public.email_verification_codes
			SET attempts_count = attempts_count + 1
			WHERE id = p_id AND usado_em IS NULL
			RETURNING attempts_count INTO v_attempts;
			
			RETURN v_attempts;
		END;
		$$ LANGUAGE plpgsql SECURITY DEFINER;

		CREATE OR REPLACE FUNCTION public.incrementar_tentativas_codigo_recuperacao(p_id uuid)
		RETURNS int AS $$
		DECLARE
			v_attempts int;
		BEGIN
			UPDATE public.password_reset_codes
			SET attempts_count = attempts_count + 1
			WHERE id = p_id AND usado_em IS NULL
			RETURNING attempts_count INTO v_attempts;
			
			RETURN v_attempts;
		END;
		$$ LANGUAGE plpgsql SECURITY DEFINER;

		-- Block 5d: Login attempts log
		CREATE TABLE IF NOT EXISTS public.login_attempts (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
			email varchar NOT NULL,
			ip_address varchar NOT NULL,
			criado_em timestamptz NOT NULL DEFAULT now()
		);

		-- Block 5e: Registration logs
		CREATE TABLE IF NOT EXISTS public.registration_logs (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
			ip_address varchar NOT NULL,
			criado_em timestamptz NOT NULL DEFAULT now()
		);
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		DROP TABLE IF EXISTS public.registration_logs;
		DROP TABLE IF EXISTS public.login_attempts;
		DROP FUNCTION IF EXISTS public.incrementar_tentativas_codigo_recuperacao(uuid);
		DROP FUNCTION IF EXISTS public.incrementar_tentativas_codigo_verificacao(uuid);
		
		ALTER TABLE public.password_reset_codes DROP COLUMN IF EXISTS attempts_count;
		ALTER TABLE public.email_verification_codes DROP COLUMN IF EXISTS attempts_count;
		ALTER TABLE public.usuarios DROP COLUMN IF EXISTS token_version;
	`);
};
