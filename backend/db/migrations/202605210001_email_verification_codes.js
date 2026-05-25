exports.up = async function (knex) {
	await knex.schema.createTable("email_verification_codes", (table) => {
		table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
		table
			.uuid("user_id")
			.notNullable()
			.references("id")
			.inTable("usuarios")
			.onDelete("CASCADE");
		table.string("code_hash").notNullable();
		table.timestamp("expira_em").notNullable();
		table.timestamp("usado_em").nullable();
		table.timestamp("criado_em").notNullable().defaultTo(knex.fn.now());
	});

	await knex.raw(
		"CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user ON email_verification_codes (user_id, expira_em)",
	);
	await knex.raw(
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_email_verification_codes_active ON email_verification_codes (user_id) WHERE usado_em IS NULL",
	);
};

exports.down = async function (knex) {
	await knex.schema.dropTableIfExists("email_verification_codes");
};
