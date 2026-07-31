const AuthService = require("../services/authService");
const ProfileService = require("../services/profileService");
const { validateProfile } = require("../validators/profile.schema");

async function getCurrentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function get(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const profile = await ProfileService.getProfile(user);
	return reply.send(profile);
}

export async function update(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateProfile(request.body);
	const profile = await ProfileService.updateProfile(payload, user);
	return reply.send(profile);
}

export default {
	get,
	update,
};
