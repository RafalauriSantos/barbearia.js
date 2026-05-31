const AuthService = require("../services/authService");
const {
	validateRegister,
	validateLogin,
	validateVerifyEmail,
	validateVerifyCode,
	validateResendCode,
	validateForgotPassword,
	validateResetPassword,
} = require("../validators/auth.schema");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function toPublicUser(user) {
	return {
		id: user.id,
		nome: user.nome || user.name || "",
		email: user.email,
		role: user.role || "admin",
		barbearia_id: user.barbearia_id || null,
		barbeiro_id: user.barbeiro_id || null,
	};
}

function createSession(user) {
	const accessToken = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
		expiresIn: "15m",
	});
	const refreshToken = jwt.sign(
		{ userId: user.id, type: "refresh" },
		env.JWT_SECRET,
		{ expiresIn: "30d" },
	);

	return { accessToken, refreshToken, user: toPublicUser(user) };
}

exports.register = async (request, reply) => {
	const payload = validateRegister(request.body);
	const { user, verificationCode } = await AuthService.register(payload);
	return reply.code(201).send({
		user: toPublicUser(user),
		email_verification_required: true,
		verification_method: "code",
		verificationCode:
			env.NODE_ENV === "production" ? undefined : verificationCode,
	});
};

exports.login = async (request, reply) => {
	const payload = validateLogin(request.body);
	const user = await AuthService.verifyCredentials(
		payload.email,
		payload.password,
	);
	if (!user) return reply.code(401).send({ error: "Invalid credentials" });

	return reply.send(createSession(user));
};

exports.refresh = async (request, reply) => {
	const { refreshToken } = request.body || {};
	if (!refreshToken)
		return reply.code(400).send({ error: "refreshToken required" });

	try {
		const decoded = jwt.verify(refreshToken, env.JWT_SECRET);
		if (decoded.type !== "refresh")
			return reply.code(400).send({ error: "Invalid token" });
		const accessToken = jwt.sign({ userId: decoded.userId }, env.JWT_SECRET, {
			expiresIn: "15m",
		});
		return reply.send({ accessToken });
	} catch (err) {
		return reply.code(401).send({ error: "Invalid refresh token" });
	}
};

exports.me = async (request, reply) => {
	const user = await AuthService.getCurrentUser(request.user.userId);
	return reply.send(toPublicUser(user));
};

exports.verifyEmail = async (request, reply) => {
	const payload = validateVerifyEmail(request.body);
	const user = await AuthService.verifyEmail(payload.token);
	return reply.send({ ok: true, user: toPublicUser(user) });
};

exports.verifyEmailCode = async (request, reply) => {
	const payload = validateVerifyCode(request.body);
	const result = await AuthService.verifyEmailCode(payload);
	if (result.verifiedNow) {
		return reply.send({ ok: true, ...createSession(result.user) });
	}

	return reply.send({
		ok: true,
		alreadyVerified: true,
		user: toPublicUser(result.user),
	});
};

exports.resendEmailCode = async (request, reply) => {
	const payload = validateResendCode(request.body);
	const result = await AuthService.resendEmailCode(payload);
	return reply.send(result);
};

exports.forgotPassword = async (request, reply) => {
	const payload = validateForgotPassword(request.body);
	const result = await AuthService.requestPasswordReset(payload);
	return reply.send(result);
};

exports.resetPassword = async (request, reply) => {
	const payload = validateResetPassword(request.body);
	const result = await AuthService.resetPassword(payload);
	return reply.send(result);
};
