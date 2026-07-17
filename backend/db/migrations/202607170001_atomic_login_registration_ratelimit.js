exports.up = async function (knex) {
	await knex.raw(`
		-- Atomic stored procedure for login rate limiting
		-- Inserts a failed login attempt and returns count within window, all in one atomic operation
		CREATE OR REPLACE FUNCTION public.incrementar_tentativas_login(
			p_email varchar,
			p_ip varchar,
			p_window_seconds int DEFAULT 900
		)
		RETURNS int AS $$
		DECLARE
			v_count int;
		BEGIN
			INSERT INTO public.login_attempts (email, ip_address)
			VALUES (p_email, p_ip);

			SELECT count(*) INTO v_count
			FROM public.login_attempts
			WHERE email = p_email
			  AND ip_address = p_ip
			  AND criado_em > (now() - (p_window_seconds || ' seconds')::interval);

			RETURN v_count;
		END;
		$$ LANGUAGE plpgsql SECURITY DEFINER;

		-- Atomic stored procedure for registration rate limiting
		-- Inserts a registration log and returns count within window, all in one atomic operation
		CREATE OR REPLACE FUNCTION public.incrementar_tentativas_registro(
			p_ip varchar,
			p_window_seconds int DEFAULT 3600
		)
		RETURNS int AS $$
		DECLARE
			v_count int;
		BEGIN
			INSERT INTO public.registration_logs (ip_address)
			VALUES (p_ip);

			SELECT count(*) INTO v_count
			FROM public.registration_logs
			WHERE ip_address = p_ip
			  AND criado_em > (now() - (p_window_seconds || ' seconds')::interval);

			RETURN v_count;
		END;
		$$ LANGUAGE plpgsql SECURITY DEFINER;
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		DROP FUNCTION IF EXISTS public.incrementar_tentativas_registro(varchar, int);
		DROP FUNCTION IF EXISTS public.incrementar_tentativas_login(varchar, varchar, int);
	`);
};
