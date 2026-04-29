(async () => {
	try {
		const { buildApp } = require("../src/index");
		const app = await buildApp();
		console.log("App built successfully");
		await app.close();
	} catch (err) {
		console.error("Error building app:");
		console.error(err.stack || err);
		process.exit(1);
	}
})();
