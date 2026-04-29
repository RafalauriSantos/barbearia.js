const ProfileService = require("../services/profileService");
const { validateProfile } = require("../validators/profile.schema");

exports.get = async (request, reply) => {
	const profile = await ProfileService.getProfile();
	return reply.send(profile);
};

exports.update = async (request, reply) => {
	const payload = validateProfile(request.body);
	const profile = await ProfileService.updateProfile(payload);
	return reply.send(profile);
};
