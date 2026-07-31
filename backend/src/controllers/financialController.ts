const AuthService = require("../services/authService");
const FinancialService = require("../services/financialService");
const {
	validateFinancialSummaryQuery,
} = require("../validators/financial.schema");

async function getCurrentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function summary(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const query = validateFinancialSummaryQuery(request.query || {});
	const data = await FinancialService.getSummary(query, user);
	return reply.send(data);
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	summary,
}; }
export default {
	summary,
};
