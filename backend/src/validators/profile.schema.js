const { z } = require("zod");

const timeSchema = z
	.string()
	.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horario invalido")
	.optional();

const profileSchema = z.object({
	shopName: z.string().trim().min(1).max(120).optional(),
	barberName: z.string().trim().min(1).max(120).optional(),
	phone: z.string().trim().max(30).optional(),
	address: z.string().trim().max(240).optional(),
	openingTime: timeSchema,
	closingTime: timeSchema,
	appointmentDuration: z.coerce.number().int().min(5).max(480).optional(),
	scheduleInterval: z.coerce.number().int().min(5).max(240).optional(),
});

function validateProfile(body) {
	return profileSchema.parse(body);
}

module.exports = { validateProfile };
