const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const AuthService = require("../services/authService");

async function auth(request, reply) {
	const authHeader = request.headers.authorization || "";
	const match = authHeader.match(/^Bearer\s+(.+)$/i);
	if (!match) {
		reply.code(401).send({ error: "Missing or invalid Authorization header" });
		return;
	}

	const token = match[1];
	try {
		const payload = jwt.verify(token, env.JWT_SECRET);
		
		const user = await AuthService.getCurrentUser(payload.userId);
		const payloadVersion = payload.tokenVersion !== undefined ? payload.tokenVersion : 1;
		const userVersion = user.token_version !== undefined ? user.token_version : 1;
		if (payloadVersion !== userVersion) {
			reply.code(401).send({ error: "Invalid or expired token session" });
			return;
		}

		request.user = payload;
		request.currentUser = user;
		return;
	} catch (err) {
		reply.code(401).send({ error: "Invalid or expired token" });
		return;
	}
}

module.exports = auth;
