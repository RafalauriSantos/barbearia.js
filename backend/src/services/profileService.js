const ProfileRepository = require("../repositories/profileRepository");

exports.getProfile = async function () {
	return ProfileRepository.get();
};

exports.updateProfile = async function (payload) {
	return ProfileRepository.upsert(payload);
};
