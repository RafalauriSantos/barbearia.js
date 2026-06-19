require("dotenv").config();
const { z } = require("zod");

const PRODUCTION_APP_URL = "https://kurt-barbearia.vercel.app";

const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		HOST: z.string().default("0.0.0.0"),
		PORT: z.coerce.number().int().positive().default(3000),
		CORS_ORIGIN: z.union([z.literal(true), z.string()]).default(true),
		SUPABASE_URL: z.string().url().optional(),
		SUPABASE_SERVICE_KEY: z.string().optional(),
		SUPABASE_ANON_KEY: z.string().optional(),
		DATABASE_URL: z.string().optional(),
		DATABASE_SSL: z.coerce.boolean().default(false),
		JWT_SECRET: z.string().min(32).optional(),
		DEFAULT_BARBEARIA_ID: z.string().uuid().optional(),
		DEFAULT_BARBEIRO_ID: z.string().uuid().optional(),
		APP_URL: z.string().url().default("http://localhost:5173"),
		SMTP_HOST: z.string().optional(),
		SMTP_PORT: z.coerce.number().int().positive().optional(),
		SMTP_SECURE: z.coerce.boolean().default(false),
		SMTP_USER: z.string().optional(),
		SMTP_PASS: z.string().optional(),
		EMAIL_FROM: z.string().default("Marque’s Barbearia <no-reply@localhost>"),
		EMAIL_BRAND_NAME: z.string().default("Marque’s Barbearia"),
		EMAIL_PROVIDER: z.enum(["smtp", "brevo"]).optional(),
		EMAIL_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
		BREVO_API_KEY: z.string().optional(),
		AVATAR_BUCKET: z.string().default("barber-avatars"),
	})
	.superRefine((env, ctx) => {
		if (env.NODE_ENV === "production" && !env.JWT_SECRET) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["JWT_SECRET"],
				message: "JWT_SECRET is required in production",
			});
		}
	});

// normalize CORS_ORIGIN: support literal 'true'/'false' env values
function normalizeCorsOrigin(value) {
	if (value === undefined) return true; // default
	const v = String(value).trim();
	if (v === "true") return true;
	if (v === "false") return false;
	return value; // keep as string origin
}

function normalizeBoolean(value, fallback = false) {
	if (value === undefined) return fallback;
	const v = String(value).trim();
	if (v === "true") return true;
	if (v === "false") return false;
	return fallback;
}

function normalizeAppUrl(value, nodeEnv) {
	const rawValue = String(value || "").trim();
	const localUrlPattern = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i;
	if (nodeEnv === "production" && (!rawValue || localUrlPattern.test(rawValue))) {
		return PRODUCTION_APP_URL;
	}
	return rawValue || undefined;
}

const parsed = envSchema.parse({
	NODE_ENV: process.env.NODE_ENV,
	HOST: process.env.HOST,
	PORT: process.env.PORT,
	CORS_ORIGIN: normalizeCorsOrigin(process.env.CORS_ORIGIN),
	SUPABASE_URL: process.env.SUPABASE_URL,
	SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
	SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
	DATABASE_URL: process.env.DATABASE_URL,
	DATABASE_SSL: normalizeBoolean(process.env.DATABASE_SSL, false),
	JWT_SECRET: process.env.JWT_SECRET,
	DEFAULT_BARBEARIA_ID: process.env.DEFAULT_BARBEARIA_ID,
	DEFAULT_BARBEIRO_ID: process.env.DEFAULT_BARBEIRO_ID,
	APP_URL: normalizeAppUrl(process.env.APP_URL, process.env.NODE_ENV),
	SMTP_HOST: process.env.SMTP_HOST,
	SMTP_PORT: process.env.SMTP_PORT,
	SMTP_SECURE: normalizeBoolean(process.env.SMTP_SECURE, false),
	SMTP_USER: process.env.SMTP_USER,
	SMTP_PASS: process.env.SMTP_PASS,
	EMAIL_FROM: process.env.EMAIL_FROM,
	EMAIL_BRAND_NAME: process.env.EMAIL_BRAND_NAME,
	EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
	EMAIL_TIMEOUT_MS: process.env.EMAIL_TIMEOUT_MS,
	BREVO_API_KEY: process.env.BREVO_API_KEY,
	AVATAR_BUCKET: process.env.AVATAR_BUCKET,
});

const env = {
	...parsed,
	JWT_SECRET:
		parsed.JWT_SECRET || "development-only-secret-change-before-production",
};

module.exports = { env };
