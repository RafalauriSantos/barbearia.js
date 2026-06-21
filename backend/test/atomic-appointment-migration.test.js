const fs = require("fs");
const path = require("path");
const t = require("tap");

const migrationPath = path.join(
	__dirname,
	"..",
	"db",
	"migrations",
	"202606210001_tenant_atomic_appointments.js",
);

t.test("atomic appointment migration contains tenant and consistency guards", (t) => {
	t.ok(fs.existsSync(migrationPath), "migration file exists");
	if (!fs.existsSync(migrationPath)) return t.end();

	const source = fs.readFileSync(migrationPath, "utf8");
	for (const requirement of [
		"salvar_agendamento_atomico",
		"excluir_agendamento_atomico",
		"PRODUCT_STOCK_INSUFFICIENT",
		"FOR UPDATE",
		"contas_receber",
		"contas_pagar_fornecedores",
		"barbearia_id",
		"UNIQUE (barbearia_id, codigo)",
	]) {
		t.match(source, requirement, requirement);
	}
	t.notMatch(source, /p_agendamento\s+\?\s+/, "avoids Knex placeholder parsing");
	t.end();
});
