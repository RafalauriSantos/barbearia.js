const { env } = require("./env");

function getDatabaseConfig() {
	if (!env.DATABASE_URL) {
		return null;
	}

	const needsSsl =
		env.DATABASE_SSL ||
		env.DATABASE_URL.includes("sslmode=require") ||
		env.DATABASE_URL.includes(".supabase.co") ||
		env.DATABASE_URL.includes(".pooler.supabase.com");

	return {
		client: "pg",
		connection: {
			connectionString: env.DATABASE_URL,
			...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
		},
		pool: {
			min: 0,
			max: 10,
		},
		migrations: {
			directory: "db/migrations",
			extension: "js",
		},
		seeds: {
			directory: "db/seeds",
		},
	};
}

module.exports = { getDatabaseConfig };
