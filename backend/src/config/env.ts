const { z } = require("zod");

const PRODUCTION_APP_URL = "https://barbearia-app.pages.dev";

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
		ADMIN_DEBUG_KEY: z.string().optional(),
		TURNSTILE_SECRET_KEY: z.string().optional(),
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

function normalizeCorsOrigin(value) {
	if (value === undefined) return true;
	const v = String(value).trim();
	if (v === "true") return true;
	if (v === "false") return false;
	return value;
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
	const isOldUrl = rawValue.includes("kurt-barbearia") || rawValue.includes("vercel.app");
	if (nodeEnv === "production" && (!rawValue || localUrlPattern.test(rawValue) || isOldUrl)) {
		return PRODUCTION_APP_URL;
	}
	return rawValue || undefined;
}

let runtimeEnv = null;

function setRuntimeEnv(rawEnv) {
	const sourceEnv = rawEnv || process.env;
	const parsed = envSchema.parse({
		NODE_ENV: sourceEnv.NODE_ENV,
		HOST: sourceEnv.HOST,
		PORT: sourceEnv.PORT,
		CORS_ORIGIN: normalizeCorsOrigin(sourceEnv.CORS_ORIGIN),
		SUPABASE_URL: sourceEnv.SUPABASE_URL,
		SUPABASE_SERVICE_KEY: sourceEnv.SUPABASE_SERVICE_KEY,
		SUPABASE_ANON_KEY: sourceEnv.SUPABASE_ANON_KEY,
		DATABASE_URL: sourceEnv.DATABASE_URL,
		DATABASE_SSL: normalizeBoolean(sourceEnv.DATABASE_SSL, false),
		JWT_SECRET: sourceEnv.JWT_SECRET,
		DEFAULT_BARBEARIA_ID: sourceEnv.DEFAULT_BARBEARIA_ID,
		DEFAULT_BARBEIRO_ID: sourceEnv.DEFAULT_BARBEIRO_ID,
		APP_URL: normalizeAppUrl(sourceEnv.APP_URL, sourceEnv.NODE_ENV),
		SMTP_HOST: sourceEnv.SMTP_HOST,
		SMTP_PORT: sourceEnv.SMTP_PORT,
		SMTP_SECURE: normalizeBoolean(sourceEnv.SMTP_SECURE, false),
		SMTP_USER: sourceEnv.SMTP_USER,
		SMTP_PASS: sourceEnv.SMTP_PASS,
		EMAIL_FROM: sourceEnv.EMAIL_FROM,
		EMAIL_BRAND_NAME: sourceEnv.EMAIL_BRAND_NAME,
		EMAIL_PROVIDER: sourceEnv.EMAIL_PROVIDER,
		EMAIL_TIMEOUT_MS: sourceEnv.EMAIL_TIMEOUT_MS,
		BREVO_API_KEY: sourceEnv.BREVO_API_KEY,
		AVATAR_BUCKET: sourceEnv.AVATAR_BUCKET,
		ADMIN_DEBUG_KEY: sourceEnv.ADMIN_DEBUG_KEY,
		TURNSTILE_SECRET_KEY: sourceEnv.TURNSTILE_SECRET_KEY,
	});

	runtimeEnv = {
		...parsed,
		JWT_SECRET:
			parsed.JWT_SECRET || "development-only-secret-change-before-production",
	};
}

// Fallback to process.env parsing for scripts or local tools
if (typeof process !== "undefined" && process.env) {
	try {
		setRuntimeEnv(process.env);
	} catch (e) {
		// Ignore validation errors during startup if variables are not fully set yet
	}
}

const env = new Proxy({}, {
	get(target, property) {
		if (!runtimeEnv) {
			// Fallback to process.env if runtimeEnv is not set yet
			return process.env[property];
		}
		return runtimeEnv[property];
	}
});

export { env, setRuntimeEnv };
export default { env, setRuntimeEnv };
