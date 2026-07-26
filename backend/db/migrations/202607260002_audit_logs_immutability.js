exports.up = async function (knex) {
	await knex.raw(`
		-- Ensure audit_logs table exists
		CREATE TABLE IF NOT EXISTS public.audit_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			tenant_id UUID REFERENCES public.barbearias(id) ON DELETE SET NULL,
			user_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
			user_role TEXT,
			action TEXT NOT NULL,
			resource_type TEXT NOT NULL,
			resource_id TEXT,
			old_values JSONB,
			new_values JSONB,
			ip_address TEXT,
			user_agent TEXT,
			request_id TEXT,
			success BOOLEAN NOT NULL DEFAULT true,
			failure_reason TEXT,
			metadata JSONB DEFAULT '{}'::jsonb
		);

		-- Function to prevent any UPDATE or DELETE operations on audit_logs table
		CREATE OR REPLACE FUNCTION public.prevent_audit_log_tampering()
		RETURNS TRIGGER AS $$
		BEGIN
			RAISE EXCEPTION 'Audit logs are immutable.';
		END;
		$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

		-- Trigger executing BEFORE UPDATE OR DELETE for each row
		DROP TRIGGER IF EXISTS trg_prevent_audit_log_tampering ON public.audit_logs;
		CREATE TRIGGER trg_prevent_audit_log_tampering
		BEFORE UPDATE OR DELETE ON public.audit_logs
		FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_tampering();

		-- Revoke UPDATE and DELETE permissions from application roles to preserve immutability
		REVOKE UPDATE, DELETE ON public.audit_logs FROM public, anon, authenticated;
		GRANT INSERT, SELECT ON public.audit_logs TO authenticated, service_role;
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		DROP TRIGGER IF EXISTS trg_prevent_audit_log_tampering ON public.audit_logs;
		DROP FUNCTION IF EXISTS public.prevent_audit_log_tampering();
	`);
};
