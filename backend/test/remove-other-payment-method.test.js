const fs = require("fs");
const path = require("path");
const t = require("tap");

const migrationPath = path.join(
	__dirname,
	"..",
	"db",
	"migrations",
	"202606210002_remove_other_payment_method.js",
);
const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
const repositoryPath = path.join(
	__dirname,
	"..",
	"src",
	"repositories",
	"paymentMethodsRepository.js",
);

t.test("remove other payment method migration preserves history", (t) => {
	t.ok(fs.existsSync(migrationPath), "migration file exists");
	if (!fs.existsSync(migrationPath)) return t.end();

	const source = fs.readFileSync(migrationPath, "utf8");
	t.match(source, /SET ativo = false\s+WHERE codigo = 'outro'/, "deactivates existing rows");
	t.match(source, /criar_formas_pagamento_padrao/, "recreates the default trigger function");
	const operationalSource = source.split("const legacyMethodsSql")[0];
	t.notMatch(
		operationalSource,
		/'outro',\s*'Outro'/,
		"does not create Outro for new shops",
	);
	t.notMatch(
		source.split("exports.down")[0],
		/DELETE\s+FROM\s+public\.formas_pagamento/i,
		"does not delete payment history",
	);
	t.end();
});

t.test("remove other payment method from bootstrap defaults", (t) => {
	const schema = fs.readFileSync(schemaPath, "utf8");
	const repository = fs.readFileSync(repositoryPath, "utf8");

	t.notMatch(schema, /\('outro',\s*'Outro'/, "schema does not seed Outro");
	t.notMatch(repository, /\boutro:\s*100/, "repository has no Outro default order");
	t.end();
});
