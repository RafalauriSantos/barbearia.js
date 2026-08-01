const { env } = require("./env");

function isSupabaseHost(urlString: string): boolean {
	try {
		const parsed = new URL(urlString);
		return parsed.hostname.endsWith(".supabase.co") || parsed.hostname.endsWith(".pooler.supabase.com");
	} catch {
		return false;
	}
}

function getDatabaseConfig() {
	if (!env.DATABASE_URL) {
		return null;
	}

	const needsSsl =
		Boolean(env.DATABASE_SSL) ||
		env.DATABASE_URL.includes("sslmode=require") ||
		isSupabaseHost(env.DATABASE_URL);

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

if (typeof module !== "undefined" && module.exports) { module.exports = { getDatabaseConfig }; }
export default { getDatabaseConfig };
