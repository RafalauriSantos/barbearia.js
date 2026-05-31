const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { AppError } = require("../lib/errors");
const { env } = require("../config/env");
const EmailService = require("./emailService");

function getVerificationRepo() {
	return require("../repositories/emailVerificationRepository");
}

function getPasswordResetRepo() {
	return require("../repositories/passwordResetRepository");
}

function getRepo() {
	return require("../repositories/authRepository");
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

exports.register = async function ({ email, password }) {
	const AuthRepository = getRepo();
	const existing = await AuthRepository.findByEmail(email);
	if (existing)
		throw new AppError(400, "ALREADY_EXISTS", "Email already registered");

	const password_hash = await argon2.hash(password, { type: argon2.argon2id });
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
		shopName: env.EMAIL_FROM?.split("<")?.[0]?.trim() || "Kash Flow",
	});

	return {
		user,
		verificationCode: env.NODE_ENV === "production" ? undefined : code,
	};
};

exports.verifyCredentials = async function (email, password) {
	const AuthRepository = getRepo();
	const user = await AuthRepository.findByEmail(email);
	if (!user) return null;
	const ok = await argon2.verify(user.password_hash, password);
	if (!ok) return null;
	if (!user.email_verificado_em) {
		throw new AppError(
			403,
			"EMAIL_NOT_VERIFIED",
			"Confirme seu email antes de entrar.",
		);
	}
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

	const codeHash = hashVerificationCode(code);
	const record = await verificationRepo.findValidByUserAndHash({
		userId: user.id,
		codeHash,
	});

	if (!record) {
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

exports.resendEmailCode = async function ({ email }) {
	const AuthRepository = getRepo();
	const verificationRepo = getVerificationRepo();
	const user = await AuthRepository.findByEmail(email);
	if (!user) {
		throw new AppError(400, "INVALID_EMAIL", "Email nao encontrado.");
	}
	if (user.email_verificado_em) {
		return { alreadyVerified: true };
	}

	const code = generateVerificationCode();
	const codeHash = hashVerificationCode(code);
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

	await verificationRepo.invalidateForUser(user.id);
	await verificationRepo.create({ userId: user.id, codeHash, expiresAt });
	await EmailService.sendVerificationCodeEmail({
		to: user.email,
		code,
		shopName: env.EMAIL_FROM?.split("<")?.[0]?.trim() || "Kash Flow",
	});

	return { ok: true };
};

exports.requestPasswordReset = async function ({ email }) {
	const AuthRepository = getRepo();
	const passwordResetRepo = getPasswordResetRepo();
	const user = await AuthRepository.findByEmail(email);
	if (!user) {
		return { ok: true };
	}

	const code = generateVerificationCode();
	const codeHash = hashVerificationCode(code);
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

	await passwordResetRepo.invalidateForUser(user.id);
	await passwordResetRepo.create({ userId: user.id, codeHash, expiresAt });
	await EmailService.sendPasswordResetCodeEmail({
		to: user.email,
		code,
		shopName: env.EMAIL_FROM?.split("<")?.[0]?.trim() || "Kash Flow",
	});

	return {
		ok: true,
		resetCode: env.NODE_ENV === "production" ? undefined : code,
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

	const codeHash = hashVerificationCode(code);
	const record = await passwordResetRepo.findValidByUserAndHash({
		userId: user.id,
		codeHash,
	});
	if (!record) {
		throw new AppError(
			400,
			"INVALID_PASSWORD_RESET_CODE",
			"Codigo invalido ou expirado.",
		);
	}

	const password_hash = await argon2.hash(password, { type: argon2.argon2id });
	await passwordResetRepo.markUsed(record.id);
	await AuthRepository.updatePassword(user.id, password_hash, {
		markEmailVerified: !user.email_verificado_em,
	});

	return { ok: true };
};
