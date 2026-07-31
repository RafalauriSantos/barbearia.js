const ProfileRepository = require("../repositories/profileRepository");
const { AppError } = require("../lib/errors");

function assertProfileContext(user) {
	if (!user?.barbearia_id) {
		throw new AppError(
			403,
			"BARBEARIA_CONTEXT_REQUIRED",
			"Usuario sem barbearia vinculada.",
		);
	}
}

exports.getProfile = async function (user) {
	assertProfileContext(user);
	return ProfileRepository.get(user);
};

exports.updateProfile = async function (payload, user) {
	assertProfileContext(user);
	return ProfileRepository.upsert(payload, user);
};
