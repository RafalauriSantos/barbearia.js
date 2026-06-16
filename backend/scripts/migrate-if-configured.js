require("dotenv").config();

async function run() {
	if (process.env.SKIP_MIGRATIONS === "true") {
		console.log("SKIP_MIGRATIONS=true; skipping migrations.");
		return;
	}

	if (!process.env.DATABASE_URL) {
		console.log("DATABASE_URL not configured; skipping migrations.");
		return;
	}

	const knexConfig = require("../knexfile");
	const environment = process.env.NODE_ENV || "development";
	const knex = require("knex")(knexConfig[environment] || knexConfig.development);

	try {
		const [, migrations] = await knex.migrate.latest();
		if (migrations.length > 0) {
			console.log(`Ran migrations: ${migrations.join(", ")}`);
		} else {
			console.log("Database migrations already up to date.");
		}
	} finally {
		await knex.destroy();
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
