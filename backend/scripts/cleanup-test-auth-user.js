require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const email = process.env.TEST_AUTH_EMAIL_TO_DELETE;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!email || !process.env.SUPABASE_URL || !key) {
	process.exit(0);
}

const supabase = createClient(process.env.SUPABASE_URL, key, {
	auth: { persistSession: false },
});

async function main() {
	const { error } = await supabase.from("usuarios").delete().eq("email", email);
	if (error) {
		console.error(error.message);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
