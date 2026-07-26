const AuthService = require("../services/authService");
const AuditService = require("../services/auditService");
const turnstileService = require("../services/turnstileService");
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

function extractTurnstileToken(request) {
	return (
		request.body?.turnstileToken ||
		request.body?.cf_turnstile_response ||
		request.headers?.["cf-turnstile-response"] ||
		""
	);
}

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
	const version = user.token_version || 1;
	const accessToken = jwt.sign(
		{ userId: user.id, tokenVersion: version },
		env.JWT_SECRET,
		{ expiresIn: "15m" }
	);
	const refreshToken = jwt.sign(
		{ userId: user.id, type: "refresh", tokenVersion: version },
		env.JWT_SECRET,
		{ expiresIn: "30d" }
	);

	return { accessToken, refreshToken, user: toPublicUser(user) };
}

exports.register = async (request, reply) => {
	const payload = validateRegister(request.body);
	const clientIp = request.ip || request.headers?.["x-forwarded-for"] || "127.0.0.1";
	const turnstileToken = extractTurnstileToken(request);

	await turnstileService.verifyToken(turnstileToken, clientIp, request.env);

	const { user, verificationCode } = await AuthService.register(payload, request.env, clientIp);

	await AuditService.record({
		action: "USER_CREATED",
		tenantId: user.barbearia_id,
		userId: user.id,
		userRole: user.role,
		resourceType: "user",
		resourceId: user.id,
		newValues: { email: user.email, nome: user.nome, role: user.role },
		request,
	});

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
	const clientIp = request.ip || request.headers?.["x-forwarded-for"] || "127.0.0.1";

	try {
		const user = await AuthService.verifyCredentials(
			payload.email,
			payload.password,
			clientIp,
		);
		if (!user) {
			await AuditService.record({
				action: "LOGIN_FAILED",
				resourceType: "user",
				request,
				success: false,
				failureReason: "Invalid credentials",
				metadata: { email: payload.email },
			});
			return reply.code(401).send({ error: "Invalid credentials" });
		}

		await AuditService.logAuth({
			action: "LOGIN_SUCCESS",
			user,
			request,
		});

		return reply.send(createSession(user));
	} catch (err) {
		await AuditService.record({
			action: "LOGIN_FAILED",
			resourceType: "user",
			request,
			success: false,
			failureReason: err.message,
			metadata: { email: payload.email },
		});
		throw err;
	}
};

exports.refresh = async (request, reply) => {
	const { refreshToken } = request.body || {};
	if (!refreshToken)
		return reply.code(400).send({ error: "refreshToken required" });

	try {
		const decoded = jwt.verify(refreshToken, env.JWT_SECRET);
		if (decoded.type !== "refresh")
			return reply.code(400).send({ error: "Invalid token" });

		const user = await AuthService.getCurrentUser(decoded.userId);
		const payloadVersion = decoded.tokenVersion !== undefined ? decoded.tokenVersion : 1;
		const userVersion = user.token_version !== undefined ? user.token_version : 1;
		if (payloadVersion !== userVersion) {
			return reply.code(401).send({ error: "Invalid refresh token session" });
		}

		const accessToken = jwt.sign(
			{ userId: decoded.userId, tokenVersion: user.token_version || 1 },
			env.JWT_SECRET,
			{ expiresIn: "15m" }
		);
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
	const clientIp = request.ip || request.headers?.["x-forwarded-for"] || "127.0.0.1";
	const turnstileToken = extractTurnstileToken(request);

	await turnstileService.verifyToken(turnstileToken, clientIp, request.env);

	const result = await AuthService.resendEmailCode(payload, request.env);
	return reply.send(result);
};

exports.forgotPassword = async (request, reply) => {
	try {
		const payload = validateForgotPassword(request.body);
		const clientIp = request.ip || request.headers?.["x-forwarded-for"] || "127.0.0.1";
		const turnstileToken = extractTurnstileToken(request);

		await turnstileService.verifyToken(turnstileToken, clientIp, request.env);

		const result = await AuthService.requestPasswordReset(payload, request.env);

		await AuditService.record({
			action: "PASSWORD_RESET_REQUESTED",
			resourceType: "user",
			request,
			metadata: { email: payload.email },
		});

		return reply.send(result);
	} catch (error) {
		if (error.code === "INVALID_TURNSTILE_TOKEN" || error.code === "TURNSTILE_SERVICE_ERROR" || error.code === "TURNSTILE_TIMEOUT") {
			throw error;
		}
		console.error("[ForgotPassword] Erro no fluxo de recuperacao de senha:", error);
		return reply.status(500).send({
			error: "Erro ao processar a recuperacao de senha. Por favor, tente novamente mais tarde.",
			code: "EMAIL_SEND_FAILED",
			details: error.message
		});
	}
};

exports.resetPassword = async (request, reply) => {
	const payload = validateResetPassword(request.body);
	const result = await AuthService.resetPassword(payload);

	await AuditService.record({
		action: "PASSWORD_RESET_COMPLETED",
		resourceType: "user",
		request,
		metadata: { email: payload.email },
	});

	return reply.send(result);
};

exports.logout = async (request, reply) => {
	const user = request.currentUser || await AuthService.getCurrentUser(request.user.userId);
	await AuthService.logout(user.id);

	await AuditService.logAuth({
		action: "LOGOUT",
		user,
		request,
	});

	return reply.send({ ok: true });
};
