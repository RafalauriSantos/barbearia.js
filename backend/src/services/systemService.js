const SystemRepository = require("../repositories/systemRepository");

exports.resetData = async function () {
	await SystemRepository.reset();
	return true;
};
