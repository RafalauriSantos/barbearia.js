require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
	process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
	console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment.");
	process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function ensureSeed() {
	try {
		// Services
		const { data: svcSample } = await supabase
			.from("services")
			.select("*")
			.limit(1);
		if (!svcSample || svcSample.length === 0) {
			console.log("Seeding services...");
			await supabase.from("services").insert([
				{ id: "svc1", name: "Corte", price: 40 },
				{ id: "svc2", name: "Barba", price: 25 },
			]);
		}

		// Products
		const { data: prodSample } = await supabase
			.from("products")
			.select("*")
			.limit(1);
		if (!prodSample || prodSample.length === 0) {
			console.log("Seeding products...");
			await supabase.from("products").insert([
				{ id: "prod1", name: "Pomada", price: 35 },
				{ id: "prod2", name: "Shampoo", price: 20 },
			]);
		}

		// Expenses
		const { data: expSample } = await supabase
			.from("expenses")
			.select("*")
			.limit(1);
		if (!expSample || expSample.length === 0) {
			console.log("Seeding expenses...");
			const today = new Date().toISOString().slice(0, 10);
			await supabase
				.from("expenses")
				.insert([{ id: "exp1", name: "Aluguel", value: 1200, date: today }]);
		}

		// Profile (singleton id)
		const { data: profileSample } = await supabase
			.from("profile")
			.select("*")
			.limit(1);
		if (!profileSample || profileSample.length === 0) {
			console.log("Seeding profile...");
			await supabase
				.from("profile")
				.upsert({
					id: "singleton",
					shopName: "Minha Barbearia",
					barberName: "Rafael",
				});
		}

		// Agendamentos
		const { data: apptSample } = await supabase
			.from("agendamentos")
			.select("*")
			.limit(1);
		if (!apptSample || apptSample.length === 0) {
			console.log("Seeding agendamentos...");
			const today = new Date().toISOString().slice(0, 10);
			await supabase
				.from("agendamentos")
				.insert([
					{
						id: "a1",
						cliente_nome: "Joao",
						data: today,
						hora: "10:00",
						barbearia_id: "default",
					},
				]);
		}

		console.log("Seeding completed.");
		process.exit(0);
	} catch (err) {
		console.error("Seed failed:", err.message || err);
		process.exit(1);
	}
}

ensureSeed();
