const AuthService = require("../services/authService");
const PaymentMethodsService = require("../services/paymentMethodsService");
const {
	validateUpdatePaymentMethod,
} = require("../validators/paymentMethods.schema");

async function getCurrentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.list = async (request, reply) => {
	const user = await getCurrentUser(request);
	const methods = await PaymentMethodsService.listPaymentMethods(user);
	return reply.send(methods);
};

exports.update = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateUpdatePaymentMethod(request.body);
	const updated = await PaymentMethodsService.updatePaymentMethod(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
};
