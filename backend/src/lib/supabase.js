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

module.exports = new Proxy(
	{},
	{
		get(_target, property) {
			return getSupabaseClient()[property];
		},
	},
);
