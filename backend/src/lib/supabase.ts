const { createClient } = require("@supabase/supabase-js");
const { env } = require("../config/env");

let client;

function getSupabaseClient() {
	if (client) return client;

	const key =
		env.SUPABASE_SERVICE_KEY ||
		env.SUPABASE_ANON_KEY ||
		(typeof process !== "undefined" && (process.env?.SUPABASE_SERVICE_KEY || process.env?.SUPABASE_ANON_KEY)) ||
		"anon-fallback-key";
	const url =
		env.SUPABASE_URL ||
		(typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
		"https://zniehugopmvoutxnpgox.supabase.co";

	if (!url || !key) {
		throw new Error(
			"SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY are required for database operations",
		);
	}

	client = createClient(url, key, {
		auth: { persistSession: false },
	});

	return client;
}

const localMethods = {
	ensureConfigured() {
		getSupabaseClient();
	},
};

const supabaseProxy = new Proxy(localMethods, {
	get(target, property) {
		if (property === "default") {
			return supabaseProxy;
		}
		if (property in target) return target[property];
		return getSupabaseClient()[property];
	},
});

if (typeof module !== "undefined" && module.exports) { module.exports = supabaseProxy; }
export default supabaseProxy;
