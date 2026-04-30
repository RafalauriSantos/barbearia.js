const { createClient } = require("@supabase/supabase-js");
const { env } = require("../config/env");

let client;

function getSupabaseClient() {
	if (client) return client;

	const key = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

	if (!env.SUPABASE_URL || !key) {
		throw new Error(
			"SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY are required for database operations",
		);
	}

	client = createClient(env.SUPABASE_URL, key, {
		auth: { persistSession: false },
	});

	return client;
}

const localMethods = {
	ensureConfigured() {
		getSupabaseClient();
	},
};

module.exports = new Proxy(localMethods, {
	get(target, property) {
		if (property in target) return target[property];
		return getSupabaseClient()[property];
	},
});
