const fs = require("fs");
const path = require("path");

exports.config = { transaction: false };

exports.up = async function (knex) {
	const schemaPath = path.join(__dirname, "..", "schema.sql");
	const schemaSql = fs.readFileSync(schemaPath, "utf8");
	await knex.raw(schemaSql);
};

exports.down = async function () {
	throw new Error(
		"Down migration disabled: this schema targets Supabase and may contain real data.",
	);
};
