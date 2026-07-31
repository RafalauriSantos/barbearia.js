const AuthService = require("../services/authService");

export function requireRole(allowedRoles: string[]) {
	return async (request: any, reply: any) => {
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

export default requireRole;
