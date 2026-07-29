const { AppError } = require("../lib/errors");
const { env } = require("../config/env");

const CLOUDFLARE_TURNSTILE_VERIFY_URL =
	"https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Official Cloudflare testing keys
const DUMMY_PASS_SECRET = "1x0000000000000000000000000000000AA";
const DUMMY_FAIL_SECRET = "2x0000000000000000000000000000000AA";

/**
 * Validates a Cloudflare Turnstile token server-side.
 * @param {string} token - The response token from Turnstile widget
 * @param {string} [remoteIp] - Optional client IP address
 * @param {object} [runtimeEnv] - Optional Cloudflare Worker environment object (c.env)
 * @returns {Promise<boolean>}
 */
async function verifyToken(token, remoteIp, runtimeEnv) {
	const secretKey =
		runtimeEnv?.TURNSTILE_SECRET_KEY ||
		env.TURNSTILE_SECRET_KEY ||
		DUMMY_PASS_SECRET;

	const nodeEnv = runtimeEnv?.NODE_ENV || env.NODE_ENV;

	// Immediate evaluation for official dummy fail key
	if (secretKey === DUMMY_FAIL_SECRET || token === "dummy-fail-token") {
		throw new AppError(
			400,
			"INVALID_TURNSTILE_TOKEN",
			"Verificação anti-bot falhou. Por favor, tente novamente.",
		);
	}

	// In test/development environment without explicit production secret keys, allow dev testing
	if (
		(nodeEnv === "test" || nodeEnv === "development") &&
		(secretKey === DUMMY_PASS_SECRET || !runtimeEnv?.TURNSTILE_SECRET_KEY)
	) {
		return true;
	}

	if (!token || typeof token !== "string" || token.trim().length === 0) {
		throw new AppError(
			400,
			"INVALID_TURNSTILE_TOKEN",
			"Verificação anti-bot é obrigatória. Por favor, complete o desafio.",
		);
	}

	try {
		const formData = new URLSearchParams();
		formData.append("secret", secretKey);
		formData.append("response", token.trim());
		if (remoteIp) {
			formData.append("remoteip", remoteIp);
		}

		// 5-second timeout signal to prevent slow-loris or stuck HTTP calls
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		const response = await fetch(CLOUDFLARE_TURNSTILE_VERIFY_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData.toString(),
			signal: controller.signal,
		}).finally(() => clearTimeout(timeoutId));

		if (!response.ok) {
			throw new AppError(
				502,
				"TURNSTILE_SERVICE_ERROR",
				"Falha na comunicação com o serviço de verificação anti-bot.",
			);
		}

		const data = await response.json();

		if (!data.success) {
			const errorCodes = data["error-codes"] || [];
			const isExpiredOrReused =
				errorCodes.includes("timeout-or-duplicate") ||
				errorCodes.includes("invalid-input-response");

			const message = isExpiredOrReused ?
				"O desafio anti-bot expirou ou já foi utilizado. Recarregue a página e tente novamente."
			:	"Verificação anti-bot falhou. Por favor, tente novamente.";

			throw new AppError(400, "INVALID_TURNSTILE_TOKEN", message, {
				errorCodes,
			});
		}

		return true;
	} catch (error) {
		if (error instanceof AppError) {
			throw error;
		}

		if (error.name === "AbortError") {
			throw new AppError(
				504,
				"TURNSTILE_TIMEOUT",
				"Tempo limite excedido na verificação anti-bot. Tente novamente.",
			);
		}

		throw new AppError(
			502,
			"TURNSTILE_SERVICE_ERROR",
			"Não foi possível validar a proteção anti-bot. Tente novamente.",
		);
	}
}

module.exports = {
	verifyToken,
	DUMMY_PASS_SECRET,
	DUMMY_FAIL_SECRET,
};
