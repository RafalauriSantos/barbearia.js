const AuthService = require("../services/authService");
const FinancialService = require("../services/financialService");
const {
	validateFinancialSummaryQuery,
} = require("../validators/financial.schema");

async function getCurrentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.summary = async (request, reply) => {
	const user = await getCurrentUser(request);
	const query = validateFinancialSummaryQuery(request.query || {});
	const summary = await FinancialService.getSummary(query, user);
	return reply.send(summary);
};
