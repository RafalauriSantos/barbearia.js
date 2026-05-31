exports.up = async function (knex) {
	await knex.raw(`
		ALTER TABLE public.barbeiros
		ADD COLUMN IF NOT EXISTS foto_url text;
	`);
};

exports.down = async function () {
	throw new Error(
		"Down migration disabled: this schema targets Supabase and may contain real data.",
	);
};
