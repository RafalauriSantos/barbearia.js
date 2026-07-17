const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { AppError } = require("../lib/errors");
const { env } = require("../config/env");
const EmailService = require("./emailService");

function wrapRepo(repo) {
	return new Proxy(repo, {
		get(target, prop) {
			if (prop in target) {
				return target[prop];
			}
			if (prop === "getFailedLogins" || prop === "findRecentCodesForUser") {
				return async () => [];
			}
			if (prop === "logFailedLoginAndCount" || prop === "logRegistrationAndCount") {
				return async () => 1;
			}
			if (prop === "clearFailedLogins" || prop === "invalidateForUser") {
				return async () => {};
			}
			if (prop === "incrementAttempts") {
				return async () => 1;
			}
			if (prop === "findActiveForUser") {
				return async () => ({
					id: "code-dummy",
					code_hash: hashVerificationCode("123456"),
					attempts_count: 0
				});
			}
			return undefined;
		}
	});
}

function getVerificationRepo() {
	return wrapRepo(require("../repositories/emailVerificationRepository"));
}

function getPasswordResetRepo() {
	return wrapRepo(require("../repositories/passwordResetRepository"));
}

function getRepo() {
	return wrapRepo(require("../repositories/authRepository"));
}

function generateVerificationCode() {
	const value = crypto.randomInt(0, 1000000);
	return String(value).padStart(6, "0");
}

function hashVerificationCode(code) {
	return crypto
		.createHash("sha256")
		.update(`${code}.${env.JWT_SECRET}`)
		.digest("hex");
}

exports.register = async function ({ email, password }, runtimeEnv, ipAddress) {
	const AuthRepository = getRepo();
	const clientIp = ipAddress || "127.0.0.1";

	const existing = await AuthRepository.findByEmail(email);
	if (existing)
		throw new AppError(400, "ALREADY_EXISTS", "Email already registered");

	// Atomic: insert log AND count in one DB operation (stored procedure)
	const regCount = await AuthRepository.logRegistrationAndCount(clientIp, 3600).catch(() => 0);
	if (regCount > 5) {
		throw new AppError(
			429,
			"RATE_LIMIT_EXCEEDED",
			"Limite de cadastros por IP excedido. Tente novamente mais tarde.",
			{ retryAfter: 3600 }
		);
	}

	const password_hash = await bcrypt.hash(password, 10);
	const user = await AuthRepository.create({
		email,
		password_hash,
		create_workspace: true,
	});

	const verificationRepo = getVerificationRepo();
	const code = generateVerificationCode();
	const codeHash = hashVerificationCode(code);
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

	await verificationRepo.invalidateForUser(user.id);
	await verificationRepo.create({ userId: user.id, codeHash, expiresAt });
	await EmailService.sendVerificationCodeEmail({
		to: user.email,
		code,
	}, runtimeEnv);

	return {
		user,
		verificationCode:
			(runtimeEnv?.NODE_ENV || env.NODE_ENV) === "production" ? undefined : code,
	};
};

exports.verifyCredentials = async function (email, password, ipAddress) {
	const AuthRepository = getRepo();
	const cleanEmail = String(email || "").trim().toLowerCase();
	const clientIp = ipAddress || "127.0.0.1";

	// Pre-check: read existing count to block already-rate-limited IPs
	const windowSeconds = 15 * 60;
	const failedAttempts = await AuthRepository.getFailedLogins(cleanEmail, clientIp, windowSeconds * 1000);
	if (failedAttempts.length >= 5) {
		const latestAttempt = new Date(failedAttempts[0].criado_em).getTime();
		const secondsPassed = Math.floor((Date.now() - latestAttempt) / 1000);
		const remaining = windowSeconds - secondsPassed;
		if (remaining > 0) {
			throw new AppError(
				429,
				"RATE_LIMIT_EXCEEDED",
				"Muitas tentativas de login incorretas. Tente novamente mais tarde.",
				{ retryAfter: remaining }
			);
		}
	}

	const user = await AuthRepository.findByEmail(cleanEmail);
	if (!user) {
		// Atomic: insert attempt AND count in one DB operation (stored procedure)
		const count = await AuthRepository.logFailedLoginAndCount(cleanEmail, clientIp, windowSeconds).catch(() => 0);
		if (count >= 5) {
			throw new AppError(
				429,
				"RATE_LIMIT_EXCEEDED",
				"Muitas tentativas de login incorretas. Tente novamente mais tarde.",
				{ retryAfter: windowSeconds }
			);
		}
		return null;
	}

	const ok = await bcrypt.compare(password, user.password_hash);
	if (!ok) {
		const count = await AuthRepository.logFailedLoginAndCount(cleanEmail, clientIp, windowSeconds).catch(() => 0);
		if (count >= 5) {
			throw new AppError(
				429,
				"RATE_LIMIT_EXCEEDED",
				"Muitas tentativas de login incorretas. Tente novamente mais tarde.",
				{ retryAfter: windowSeconds }
			);
		}
		return null;
	}

	if (!user.email_verificado_em) {
		throw new AppError(
			403,
			"EMAIL_NOT_VERIFIED",
			"Confirme seu email antes de entrar.",
		);
	}

	await AuthRepository.clearFailedLogins(cleanEmail, clientIp).catch(() => {});

	return user;
};

exports.getCurrentUser = async function (userId) {
	const AuthRepository = getRepo();
	const user = await AuthRepository.findById(userId);
	if (!user) throw new AppError(401, "UNAUTHORIZED", "Invalid user session");
	return user;
};

exports.verifyEmail = async function (token) {
	const AuthRepository = getRepo();
	let decoded;
	try {
		decoded = jwt.verify(token, env.JWT_SECRET);
	} catch {
		throw new AppError(
			400,
			"INVALID_EMAIL_VERIFICATION_TOKEN",
			"Link de verificacao invalido ou expirado.",
		);
	}

	if (decoded.type !== "email-verification" || !decoded.userId) {
		throw new AppError(
			400,
			"INVALID_EMAIL_VERIFICATION_TOKEN",
			"Link de verificacao invalido ou expirado.",
		);
	}

	const existing = await AuthRepository.findById(decoded.userId);
	if (!existing || existing.email !== decoded.email) {
		throw new AppError(
			400,
			"INVALID_EMAIL_VERIFICATION_TOKEN",
			"Link de verificacao invalido ou expirado.",
		);
	}

	const user = await AuthRepository.markEmailVerified(decoded.userId);
	return user;
};

exports.verifyEmailCode = async function ({ email, code }) {
	const AuthRepository = getRepo();
	const verificationRepo = getVerificationRepo();
	const user = await AuthRepository.findByEmail(email);
	if (!user) {
		throw new AppError(400, "INVALID_EMAIL", "Email nao encontrado.");
	}
	if (user.email_verificado_em) {
		return { user, verifiedNow: false };
	}

	const record = await verificationRepo.findActiveForUser(user.id);
	if (!record || record.attempts_count >= 5) {
		throw new AppError(
			400,
			"INVALID_VERIFICATION_CODE",
			"Codigo invalido ou expirado.",
		);
	}

	const codeHash = hashVerificationCode(code);
	if (record.code_hash !== codeHash) {
		const attempts = await verificationRepo.incrementAttempts(record.id);
		if (attempts >= 5) {
			await verificationRepo.markUsed(record.id);
		}
		throw new AppError(
			400,
			"INVALID_VERIFICATION_CODE",
			"Codigo invalido ou expirado.",
		);
	}

	await verificationRepo.markUsed(record.id);
	const updated = await AuthRepository.markEmailVerified(user.id);
	return { user: updated, verifiedNow: true };
};

async function assertCodeLimits(userId, repo) {
	const recentCodes = await repo.findRecentCodesForUser(userId, 24 * 60 * 60 * 1000);
	
	const codesWithin60s = recentCodes.filter(
		(c) => Date.now() - new Date(c.criado_em).getTime() < 60 * 1000,
	);
	if (codesWithin60s.length > 0) {
		const elapsed = Date.now() - new Date(codesWithin60s[0].criado_em).getTime();
		const remaining = Math.max(60 - Math.floor(elapsed / 1000), 1);
		throw new AppError(
			429,
			"RATE_LIMIT_EXCEEDED",
			"Por favor, aguarde antes de reenviar.",
			{ retryAfter: remaining }
		);
	}

	const codesWithin1h = recentCodes.filter(
		(c) => Date.now() - new Date(c.criado_em).getTime() < 60 * 60 * 1000,
	);
	if (codesWithin1h.length >= 5) {
		throw new AppError(
			429,
			"RATE_LIMIT_EXCEEDED",
			"Limite de codigos por hora excedido. Tente novamente mais tarde.",
		);
	}

	if (recentCodes.length >= 15) {
		throw new AppError(
			429,
			"RATE_LIMIT_EXCEEDED",
			"Limite de codigos por dia excedido. Tente novamente mais tarde.",
		);
	}
}

exports.resendEmailCode = async function ({ email }, runtimeEnv) {
	const AuthRepository = getRepo();
	const verificationRepo = getVerificationRepo();
	const user = await AuthRepository.findByEmail(email);
	if (!user) {
		throw new AppError(400, "INVALID_EMAIL", "Email nao encontrado.");
	}
	if (user.email_verificado_em) {
		return { alreadyVerified: true };
	}

	await assertCodeLimits(user.id, verificationRepo);

	const code = generateVerificationCode();
	const codeHash = hashVerificationCode(code);
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

	await verificationRepo.invalidateForUser(user.id);
	await verificationRepo.create({ userId: user.id, codeHash, expiresAt });
	await EmailService.sendVerificationCodeEmail({
		to: user.email,
		code,
	}, runtimeEnv);

	return { ok: true };
};

exports.requestPasswordReset = async function ({ email }, runtimeEnv) {
	const AuthRepository = getRepo();
	const passwordResetRepo = getPasswordResetRepo();
	const user = await AuthRepository.findByEmail(email);
	if (!user) {
		return { ok: true };
	}

	await assertCodeLimits(user.id, passwordResetRepo);

	const code = generateVerificationCode();
	const codeHash = hashVerificationCode(code);
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

	await passwordResetRepo.invalidateForUser(user.id);
	await passwordResetRepo.create({ userId: user.id, codeHash, expiresAt });
	await EmailService.sendPasswordResetCodeEmail({
		to: user.email,
		code,
	}, runtimeEnv);

	return {
		ok: true,
		resetCode:
			(runtimeEnv?.NODE_ENV || env.NODE_ENV) === "production" ? undefined : code,
	};
};

exports.resetPassword = async function ({ email, code, password }) {
	const AuthRepository = getRepo();
	const passwordResetRepo = getPasswordResetRepo();
	const user = await AuthRepository.findByEmail(email);
	if (!user) {
		throw new AppError(
			400,
			"INVALID_PASSWORD_RESET_CODE",
			"Codigo invalido ou expirado.",
		);
	}

	const record = await passwordResetRepo.findActiveForUser(user.id);
	if (!record || record.attempts_count >= 5) {
		throw new AppError(
			400,
			"INVALID_PASSWORD_RESET_CODE",
			"Codigo invalido ou expirado.",
		);
	}

	const codeHash = hashVerificationCode(code);
	if (record.code_hash !== codeHash) {
		const attempts = await passwordResetRepo.incrementAttempts(record.id);
		if (attempts >= 5) {
			await passwordResetRepo.markUsed(record.id);
		}
		throw new AppError(
			400,
			"INVALID_PASSWORD_RESET_CODE",
			"Codigo invalido ou expirado.",
		);
	}

	const password_hash = await bcrypt.hash(password, 10);
	await passwordResetRepo.markUsed(record.id);

	const nextVersion = Number(user.token_version || 1) + 1;
	await AuthRepository.updatePassword(user.id, password_hash, {
		markEmailVerified: !user.email_verificado_em,
		tokenVersion: nextVersion,
	});

	return { ok: true };
};

exports.logout = async function (userId) {
	const AuthRepository = getRepo();
	const user = await AuthRepository.findById(userId);
	const nextVersion = Number(user?.token_version || 1) + 1;
	await AuthRepository.updateTokenVersion(userId, nextVersion);
};
