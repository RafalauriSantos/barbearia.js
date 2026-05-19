const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const { AppError } = require("../lib/errors");
const { env } = require("../config/env");
const EmailService = require("./emailService");

function getRepo() {
	return require("../repositories/authRepository");
}

exports.register = async function ({ email, password }) {
	const AuthRepository = getRepo();
	const existing = await AuthRepository.findByEmail(email);
	if (existing)
		throw new AppError(400, "ALREADY_EXISTS", "Email already registered");

	const password_hash = await argon2.hash(password, { type: argon2.argon2id });
	const user = await AuthRepository.create({ email, password_hash });
	const token = jwt.sign(
		{ type: "email-verification", userId: user.id, email: user.email },
		env.JWT_SECRET,
		{ expiresIn: "24h" },
	);
	const verificationUrl = `${env.APP_URL.replace(/\/$/, "")}/verify-email?token=${token}`;

	await EmailService.sendVerificationEmail({ to: user.email, verificationUrl });

	return { user, verificationUrl };
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
