import { z } from "zod";

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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type ResendCodeInput = z.infer<typeof resendCodeSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function validateRegister(body: unknown) {
	return registerSchema.parse(body);
}

export function validateLogin(body: unknown) {
	return loginSchema.parse(body);
}

export function validateVerifyEmail(body: unknown) {
	return verifyEmailSchema.parse(body);
}

export function validateVerifyCode(body: unknown) {
	return verifyCodeSchema.parse(body);
}

export function validateResendCode(body: unknown) {
	return resendCodeSchema.parse(body);
}

export function validateForgotPassword(body: unknown) {
	return forgotPasswordSchema.parse(body);
}

export function validateResetPassword(body: unknown) {
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
export default module.exports;
