const { z } = require("zod");

const dateString = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Use date format YYYY-MM-DD");

const financialSummaryQuerySchema = z
	.object({
		start_date: dateString.optional(),
		end_date: dateString.optional(),
		barbeiro_id: z.string().min(1).optional(),
		barber_id: z.string().min(1).optional(),
	})
	.superRefine((query, ctx) => {
		if (query.start_date && query.end_date && query.start_date > query.end_date) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["end_date"],
				message: "end_date must be greater than or equal to start_date",
			});
		}
	});

function validateFinancialSummaryQuery(query) {
	return financialSummaryQuerySchema.parse(query || {});
}

module.exports = { validateFinancialSummaryQuery };
