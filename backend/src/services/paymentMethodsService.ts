const PaymentMethodsRepository = require("../repositories/paymentMethodsRepository");
import { AppError } from "../lib/errors";

function isMissingFeeColumn(error: any): boolean {
	const text = `${error?.code || ""} ${error?.message || ""} ${
		error?.details || ""
	}`;
	return text.includes("taxa_percentual") || text.includes("ordem");
}

function assertBarbeariaContext(user: any) {
	if (!user?.barbearia_id) {
		throw new AppError(
			403,
			"BARBEARIA_CONTEXT_REQUIRED",
			"Usuario sem barbearia vinculada.",
		);
	}
}

function assertAdmin(user: any) {
	if (user?.role !== "admin") {
		throw new AppError(
			403,
			"ADMIN_REQUIRED",
			"Somente o dono pode alterar formas de pagamento.",
		);
	}
}

export async function listPaymentMethods(user: any) {
	assertBarbeariaContext(user);
	return PaymentMethodsRepository.findAll({ barbeariaId: user.barbearia_id });
}

export async function updatePaymentMethod(id: string, updates: Record<string, any>, user: any) {
	assertBarbeariaContext(user);
	assertAdmin(user);
	const context = { barbeariaId: user.barbearia_id };
	const existing = await PaymentMethodsRepository.findById(id, context);
	if (!existing) {
		throw new AppError(404, "NOT_FOUND", "Forma de pagamento nao encontrada.");
	}
	try {
		return await PaymentMethodsRepository.update(id, updates, context);
	} catch (error) {
		if (isMissingFeeColumn(error)) {
			throw new AppError(
				409,
				"PAYMENT_METHOD_MIGRATION_REQUIRED",
				"Atualize o banco de dados antes de salvar taxas de pagamento.",
			);
		}
		throw error;
	}
}

module.exports = {
	listPaymentMethods,
	updatePaymentMethod,
};
