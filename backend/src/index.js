const { buildApp } = require("./app");
const { start } = require("./server");

module.exports = { buildApp, start };

if (require.main === module) {
	start();
}
