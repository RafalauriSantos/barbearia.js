const argon2 = require("argon2");
const { AppError } = require("../lib/errors");

function getRepo() {
	return require("../repositories/authRepository");
}

exports.register = async function ({ email, password }) {
	const AuthRepository = getRepo();
	const existing = await AuthRepository.findByEmail(email);
	if (existing)
		throw new AppError(400, "ALREADY_EXISTS", "Email already registered");

	const password_hash = await argon2.hash(password, { type: argon2.argon2id });
	const user = await AuthRepository.create({ email, password_hash });
	return user;
};

exports.verifyCredentials = async function (email, password) {
	const AuthRepository = getRepo();
	const user = await AuthRepository.findByEmail(email);
	if (!user) return null;
	const ok = await argon2.verify(user.password_hash, password);
	return ok ? user : null;
};
