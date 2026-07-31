const AuthService = require("../services/authService");
const PaymentMethodsService = require("../services/paymentMethodsService");
const {
	validateUpdatePaymentMethod,
} = require("../validators/paymentMethods.schema");

async function getCurrentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function list(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const methods = await PaymentMethodsService.listPaymentMethods(user);
	return reply.send(methods);
}

export async function update(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateUpdatePaymentMethod(request.body);
	const updated = await PaymentMethodsService.updatePaymentMethod(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	list,
	update,
}; }
export default {
	list,
	update,
};
