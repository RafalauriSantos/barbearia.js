const { AppError } = require("./errors");
const { env } = require("../config/env");

function getDefaultBarbeariaId() {
	if (!env.DEFAULT_BARBEARIA_ID) {
		throw new AppError(
			500,
			"TENANT_NOT_CONFIGURED",
			"DEFAULT_BARBEARIA_ID is required until authentication context is implemented",
		);
	}

	return env.DEFAULT_BARBEARIA_ID;
}

function getDefaultBarbeiroId() {
	return env.DEFAULT_BARBEIRO_ID || null;
}

module.exports = { getDefaultBarbeariaId, getDefaultBarbeiroId };
