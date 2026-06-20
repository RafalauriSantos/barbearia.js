process.env.SUPABASE_URL = process.env.SUPABASE_URL || "http://localhost";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon";

const t = require("tap");
const { _private } = require("../src/repositories/appointmentsRepository");

t.test("joined appointment items keep catalog id instead of join row id", async (t) => {
	const items = _private.normalizeItemList([
		{
			id: "join-row-id",
			produto_id: "product-catalog-id",
			nome_produto: "Gel",
			preco_unitario: 25,
		},
	]);

	t.equal(items[0].id, "product-catalog-id");
	t.equal(items[0].catalog_id, "product-catalog-id");
});
