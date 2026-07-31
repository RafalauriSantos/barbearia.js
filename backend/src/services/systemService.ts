const SystemRepository = require("../repositories/systemRepository");

export async function resetData(): Promise<boolean> {
	await SystemRepository.reset();
	return true;
}

module.exports = { resetData };
export default module.exports;
