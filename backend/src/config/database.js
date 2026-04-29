const { env } = require("./env");

function getDatabaseConfig() {
	if (!env.DATABASE_URL) {
		return null;
	}

	return {
		client: "pg",
		connection: env.DATABASE_URL,
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
