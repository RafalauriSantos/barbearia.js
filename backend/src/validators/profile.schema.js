const { z } = require("zod");

const profileSchema = z.object({
	shopName: z.string().optional(),
	barberName: z.string().optional(),
});

function validateProfile(body) {
	return profileSchema.parse(body);
}

module.exports = { validateProfile };
