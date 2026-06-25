const AuthService = require("../services/authService");
const SupplierPayablesService = require("../services/supplierPayablesService");
const {
	validateSupplierPayablesQuery,
	validatePaySupplierPayable,
} = require("../validators/supplierPayables.schema");

async function currentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.list = async (request, reply) => {
	const user = await currentUser(request);
	return reply.send(
		await SupplierPayablesService.list(
			validateSupplierPayablesQuery(request.query),
			user,
		),
	);
};

exports.pay = async (request, reply) => {
	const user = await currentUser(request);
	return reply.send(
		await SupplierPayablesService.pay(
			request.params.id,
			validatePaySupplierPayable(request.body),
			user,
		),
	);
};

exports.createPurchase = async (request, reply) => {
	const user = await currentUser(request);
	const { validateCreatePurchase } = require("../validators/supplierPayables.schema");
	return reply.code(201).send(
		await SupplierPayablesService.createPurchase(
			validateCreatePurchase(request.body),
			user,
		),
	);
};

