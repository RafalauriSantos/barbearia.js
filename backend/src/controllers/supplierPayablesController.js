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

