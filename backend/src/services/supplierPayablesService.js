const SupplierPayablesRepository = require("../repositories/supplierPayablesRepository");
const { AppError } = require("../lib/errors");

function contextFor(user) {
	if (!user?.barbearia_id || user.role !== "admin") {
		throw new AppError(403, "SUPPLIER_PAYABLES_FORBIDDEN", "Apenas o administrador pode gerenciar fornecedores.");
	}
	return { barbeariaId: user.barbearia_id };
}

exports.list = async function (query, user) {
	return SupplierPayablesRepository.findAll({
		...contextFor(user),
		status: query.status || "aberto",
		startDate: query.start_date,
		endDate: query.end_date,
	});
};

exports.pay = async function (id, payload, user) {
	const context = contextFor(user);
	const payable = await SupplierPayablesRepository.findById(id, context);
	if (!payable) {
		throw new AppError(404, "SUPPLIER_PAYABLE_NOT_FOUND", "Conta de fornecedor nao encontrada.");
	}
	if (payable.status === "pago") return payable;
	if (payable.status !== "aberto") {
		throw new AppError(409, "SUPPLIER_PAYABLE_CLOSED", "Esta conta nao esta aberta.");
	}
	return SupplierPayablesRepository.pay(id, payload.payment_date, context);
};

exports.createPurchase = async function (payload, user) {
	const context = contextFor(user);
	// We need to pass barbeiroId so the receivable belongs to the admin who created it, or null
	return SupplierPayablesRepository.createPurchase(payload, {
		barbeariaId: context.barbeariaId,
		barbeiroId: user.barbeiro_id || null,
	});
};

