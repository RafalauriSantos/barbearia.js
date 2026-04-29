const AuthService = require("../services/authService");
const {
	validateRegister,
	validateLogin,
} = require("../validators/auth.schema");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function toPublicUser(user) {
	const { password_hash, senha_hash, ...publicUser } = user;
	return publicUser;
}

exports.register = async (request, reply) => {
	const payload = validateRegister(request.body);
	const user = await AuthService.register(payload);
	return reply.code(201).send({ user: toPublicUser(user) });
};

exports.login = async (request, reply) => {
	const payload = validateLogin(request.body);
	const user = await AuthService.verifyCredentials(
		payload.email,
		payload.password,
	);
	if (!user) return reply.code(401).send({ error: "Invalid credentials" });

	const accessToken = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
		expiresIn: "15m",
	});
	const refreshToken = jwt.sign(
		{ userId: user.id, type: "refresh" },
		env.JWT_SECRET,
		{ expiresIn: "30d" },
	);

	return reply.send({ accessToken, refreshToken, user: toPublicUser(user) });
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
