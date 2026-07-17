const AuthService = require("../services/authService");

function requireRole(allowedRoles) {
	return async (request, reply) => {
		if (!request.user || !request.user.userId) {
			reply.code(401).send({ error: "Unauthorized" });
			return;
		}

		try {
			const user = request.currentUser || await AuthService.getCurrentUser(request.user.userId);
			if (!allowedRoles.includes(user.role)) {
				reply.code(403).send({ error: "Forbidden: insufficient permissions" });
				return;
			}
			request.currentUser = user;
		} catch (err) {
			reply.code(401).send({ error: "Invalid session" });
		}
	};
}

module.exports = requireRole;
