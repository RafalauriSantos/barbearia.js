exports.up = async function (knex) {
	await knex.raw(`
		-- Add login lockout columns to usuarios table
		ALTER TABLE public.usuarios 
		ADD COLUMN IF NOT EXISTS tentativas_login_falhas integer DEFAULT 0,
		ADD COLUMN IF NOT EXISTS bloqueado_ate timestamptz DEFAULT NULL;

		-- Atomic procedure to record failed login attempt and set lock timestamp if max reached
		CREATE OR REPLACE FUNCTION public.registrar_falha_login_usuario(
			p_email varchar,
			p_max_attempts int DEFAULT 5,
			p_lockout_seconds int DEFAULT 900
		)
		RETURNS jsonb AS $$
		DECLARE
			v_user RECORD;
			v_new_attempts int;
			v_locked_until timestamptz;
		BEGIN
			SELECT id, tentativas_login_falhas, bloqueado_ate INTO v_user
			FROM public.usuarios
			WHERE LOWER(email) = LOWER(p_email)
			FOR UPDATE;

			IF NOT FOUND THEN
				RETURN jsonb_build_object('found', false, 'attempts', 0, 'locked', false);
			END IF;

			-- Reset attempts if previous lockout period has expired
			IF v_user.bloqueado_ate IS NOT NULL AND v_user.bloqueado_ate <= now() THEN
				v_new_attempts := 1;
				v_locked_until := NULL;
			ELSE
				v_new_attempts := COALESCE(v_user.tentativas_login_falhas, 0) + 1;
				IF v_new_attempts >= p_max_attempts THEN
					v_locked_until := now() + (p_lockout_seconds || ' seconds')::interval;
				ELSE
					v_locked_until := NULL;
				END IF;
			END IF;

			UPDATE public.usuarios
			SET tentativas_login_falhas = v_new_attempts,
				bloqueado_ate = v_locked_until
			WHERE id = v_user.id;

			RETURN jsonb_build_object(
				'found', true,
				'attempts', v_new_attempts,
				'locked', v_locked_until IS NOT NULL,
				'locked_until', v_locked_until
			);
		END;
		$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

		-- Atomic procedure to reset failed login attempts on successful login
		CREATE OR REPLACE FUNCTION public.resetar_falhas_login_usuario(p_user_id uuid)
		RETURNS void AS $$
		BEGIN
			UPDATE public.usuarios
			SET tentativas_login_falhas = 0,
				bloqueado_ate = NULL
			WHERE id = p_user_id;
		END;
		$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		DROP FUNCTION IF EXISTS public.resetar_falhas_login_usuario(uuid);
		DROP FUNCTION IF EXISTS public.registrar_falha_login_usuario(varchar, int, int);
		ALTER TABLE public.usuarios 
		DROP COLUMN IF EXISTS bloqueado_ate,
		DROP COLUMN IF EXISTS tentativas_login_falhas;
	`);
};
