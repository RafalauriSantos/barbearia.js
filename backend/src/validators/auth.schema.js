const { z } = require("zod");

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

const verifyEmailSchema = z.object({
	token: z.string().min(32),
});

function validateRegister(body) {
	return registerSchema.parse(body);
}

function validateLogin(body) {
	return loginSchema.parse(body);
}

function validateVerifyEmail(body) {
	return verifyEmailSchema.parse(body);
}

module.exports = { validateRegister, validateLogin, validateVerifyEmail };
