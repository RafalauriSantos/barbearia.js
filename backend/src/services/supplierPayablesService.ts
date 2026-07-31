const SupplierPayablesRepository = require("../repositories/supplierPayablesRepository");
import { AppError } from "../lib/errors";

function contextFor(user: any) {
	if (!user?.barbearia_id || user.role !== "admin") {
		throw new AppError(403, "SUPPLIER_PAYABLES_FORBIDDEN", "Apenas o administrador pode gerenciar fornecedores.");
	}
	return { barbeariaId: user.barbearia_id };
}

export async function list(query: Record<string, any> = {}, user: any) {
	return SupplierPayablesRepository.findAll({
		...contextFor(user),
		status: query.status || "aberto",
		startDate: query.start_date,
		endDate: query.end_date,
	});
}

export async function pay(id: string, payload: Record<string, any>, user: any) {
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
}

export async function createPurchase(payload: Record<string, any>, user: any) {
	const context = contextFor(user);
	return SupplierPayablesRepository.createPurchase(payload, {
		barbeariaId: context.barbeariaId,
		barbeiroId: user.barbeiro_id || null,
	});
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	list,
	pay,
	createPurchase,
}; }
export default {
	list,
	pay,
	createPurchase,
};
