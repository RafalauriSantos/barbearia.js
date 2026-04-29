const { buildApp } = require("./app");
const { env } = require("./config/env");

async function start() {
	const app = await buildApp();

	try {
		const address = await app.listen({
			host: env.HOST,
			port: env.PORT,
		});
		app.log.info(`Server listening at ${address}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

module.exports = { start };

if (require.main === module) {
	start();
}
