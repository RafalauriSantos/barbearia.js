exports.config = { transaction: false };

exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.usuarios
		ADD COLUMN IF NOT EXISTS email_verificado_em timestamptz;

		UPDATE public.usuarios
		SET email_verificado_em = COALESCE(email_verificado_em, now())
		WHERE email_verificado_em IS NULL;
	`);
};

exports.down = async function () {
	throw new Error(
		"Down migration disabled: email verification migration may contain real data.",
	);
};
