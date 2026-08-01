const { createClient } = require("@supabase/supabase-js");
const { env } = require("../config/env");

let client;
let lastUrl = "";
let lastKey = "";

function getSupabaseClient() {
	const url =
		env.SUPABASE_URL ||
		(typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
		"https://zniehugopmvoutxnpgox.supabase.co";
	const key =
		env.SUPABASE_SERVICE_KEY ||
		env.SUPABASE_ANON_KEY ||
		(typeof process !== "undefined" && (process.env?.SUPABASE_SERVICE_KEY || process.env?.SUPABASE_ANON_KEY)) ||
		"anon-fallback-key";

	// Recreate client if credentials changed (e.g. setRuntimeEnv loaded real secrets)
	if (client && url === lastUrl && key === lastKey) {
		return client;
	}

	if (!url || !key) {
		throw new Error(
			"SUPABASE_URL and SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY are required for database operations",
		);
	}

	client = createClient(url, key, {
		auth: { persistSession: false },
	});
	lastUrl = url;
	lastKey = key;

	return client;
}

const localMethods: Record<string, any> = {
	ensureConfigured() {
		getSupabaseClient();
	},
};

const supabaseProxy: any = new Proxy(localMethods, {
	get(target, property) {
		if (property === "default" || property === "__esModule") {
			return supabaseProxy;
		}
		if (property in target) return target[property as string];
		const instance = getSupabaseClient();
		const val = instance[property as string];
		return typeof val === "function" ? val.bind(instance) : val;
	},
});

export { supabaseProxy };
if (typeof module !== "undefined" && module.exports) {
	module.exports = supabaseProxy;
	module.exports.default = supabaseProxy;
	module.exports.__esModule = true;
}
export default supabaseProxy;


