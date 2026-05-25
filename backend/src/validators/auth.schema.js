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

const verifyCodeSchema = z.object({
	email: z.string().email(),
	code: z.string().regex(/^\d{6}$/),
});

const resendCodeSchema = z.object({
	email: z.string().email(),
});

const forgotPasswordSchema = z.object({
	email: z.string().email(),
});

const resetPasswordSchema = z.object({
	email: z.string().email(),
	code: z.string().regex(/^\d{6}$/),
	password: z.string().min(8),
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

function validateVerifyCode(body) {
	return verifyCodeSchema.parse(body);
}

function validateResendCode(body) {
	return resendCodeSchema.parse(body);
}

function validateForgotPassword(body) {
	return forgotPasswordSchema.parse(body);
}

function validateResetPassword(body) {
	return resetPasswordSchema.parse(body);
}

module.exports = {
	validateRegister,
	validateLogin,
	validateVerifyEmail,
	validateVerifyCode,
	validateResendCode,
	validateForgotPassword,
	validateResetPassword,
};
