const AuthService = require("../services/authService");
const SupplierPayablesService = require("../services/supplierPayablesService");
const {
	validateSupplierPayablesQuery,
	validatePaySupplierPayable,
	validateCreatePurchase,
} = require("../validators/supplierPayables.schema");

async function currentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function list(request: any, reply: any) {
	const user = await currentUser(request);
	return reply.send(
		await SupplierPayablesService.list(
			validateSupplierPayablesQuery(request.query),
			user,
		),
	);
}

export async function pay(request: any, reply: any) {
	const user = await currentUser(request);
	return reply.send(
		await SupplierPayablesService.pay(
			request.params.id,
			validatePaySupplierPayable(request.body),
			user,
		),
	);
}

export async function createPurchase(request: any, reply: any) {
	const user = await currentUser(request);
	return reply.code(201).send(
		await SupplierPayablesService.createPurchase(
			validateCreatePurchase(request.body),
			user,
		),
	);
}

module.exports = {
	list,
	pay,
	createPurchase,
};
export default module.exports;
