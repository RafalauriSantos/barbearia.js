const { z } = require("zod");

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

function validateRegister(body) {
	return registerSchema.parse(body);
}

function validateLogin(body) {
	return loginSchema.parse(body);
}

module.exports = { validateRegister, validateLogin };
