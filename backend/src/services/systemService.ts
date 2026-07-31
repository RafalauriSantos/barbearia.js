const SystemRepository = require("../repositories/systemRepository");

export async function resetData(): Promise<boolean> {
	await SystemRepository.reset();
	return true;
}

export default { resetData };
