const { AppError } = require("./errors");
const { env } = require("../config/env");

export function getDefaultBarbeariaId(): string {
	if (!env.DEFAULT_BARBEARIA_ID) {
		throw new AppError(
			500,
			"TENANT_NOT_CONFIGURED",
			"DEFAULT_BARBEARIA_ID is required until authentication context is implemented",
		);
	}

	return env.DEFAULT_BARBEARIA_ID;
}

export function getDefaultBarbeiroId(): string | null {
	return env.DEFAULT_BARBEIRO_ID || null;
}

module.exports = { getDefaultBarbeariaId, getDefaultBarbeiroId };
