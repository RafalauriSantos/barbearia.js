require("dotenv").config();
const { z } = require("zod");

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
		JWT_SECRET: z.string().min(32).optional(),
		DEFAULT_BARBEARIA_ID: z.string().uuid().optional(),
		DEFAULT_BARBEIRO_ID: z.string().uuid().optional(),
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

const parsed = envSchema.parse({
	NODE_ENV: process.env.NODE_ENV,
	HOST: process.env.HOST,
	PORT: process.env.PORT,
	CORS_ORIGIN: process.env.CORS_ORIGIN || true,
	SUPABASE_URL: process.env.SUPABASE_URL,
	SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
	SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
	DATABASE_URL: process.env.DATABASE_URL,
	JWT_SECRET: process.env.JWT_SECRET,
	DEFAULT_BARBEARIA_ID: process.env.DEFAULT_BARBEARIA_ID,
	DEFAULT_BARBEIRO_ID: process.env.DEFAULT_BARBEIRO_ID,
});

const env = {
	...parsed,
	JWT_SECRET:
		parsed.JWT_SECRET ||
		"development-only-secret-change-before-production",
};

module.exports = { env };
