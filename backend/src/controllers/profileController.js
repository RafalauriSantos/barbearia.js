const AuthService = require("../services/authService");
const ProfileService = require("../services/profileService");
const { validateProfile } = require("../validators/profile.schema");

async function getCurrentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.get = async (request, reply) => {
	const user = await getCurrentUser(request);
	const profile = await ProfileService.getProfile(user);
	return reply.send(profile);
};

exports.update = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateProfile(request.body);
	const profile = await ProfileService.updateProfile(payload, user);
	return reply.send(profile);
};
