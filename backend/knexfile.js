const { getDatabaseConfig } = require("./src/config/database");

const config = getDatabaseConfig();

if (!config) {
	throw new Error("DATABASE_URL is required to run Knex commands");
}

module.exports = {
	development: config,
	test: config,
	production: config,
};
