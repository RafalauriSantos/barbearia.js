const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

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
 		request.user = payload;
 		return;
 	} catch (err) {
 		reply.code(401).send({ error: "Invalid or expired token" });
 		return;
 	}
}

module.exports = auth;
