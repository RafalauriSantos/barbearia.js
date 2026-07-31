const SystemRepository = require("../repositories/systemRepository");

export async function resetData(): Promise<boolean> {
	await SystemRepository.reset();
	return true;
}

if (typeof module !== "undefined" && module.exports) { module.exports = { resetData }; }
export default { resetData };
