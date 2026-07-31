const ExpensesRepository = require("../repositories/expensesRepository");
const AuditService = require("./auditService");
import { AppError } from "../lib/errors";

function getBarbeariaContext(user: any) {
	if (!user?.barbearia_id) {
		throw new AppError(
			403,
			"BARBEARIA_CONTEXT_REQUIRED",
			"Usuario sem barbearia vinculada.",
		);
	}
	return { barbeariaId: user.barbearia_id };
}

function assertAdminContext(user: any) {
	const context = getBarbeariaContext(user);
	if (user.role !== "admin") {
		throw new AppError(
			403,
			"EXPENSES_FORBIDDEN",
			"Apenas administradores podem gerenciar despesas.",
		);
	}
	return context;
}

export async function listExpenses({ date, start_date, end_date }: { date?: string; start_date?: string; end_date?: string } = {}, user: any = {}) {
	const startDate =
		start_date && end_date && start_date > end_date ? end_date : start_date;
	const endDate =
		start_date && end_date && start_date > end_date ? start_date : end_date;
	return ExpensesRepository.findAll({
		date,
		startDate,
		endDate,
		...getBarbeariaContext(user),
	});
}

export async function createExpense(payload: Record<string, any>, user: any) {
	const expense = await ExpensesRepository.create(payload, assertAdminContext(user));
	await AuditService.logResourceChange({
		action: "EXPENSE_CREATED",
		resourceType: "expense",
		resourceId: expense.id,
		user,
		newValues: { description: expense.description, value: expense.value },
	});
	return expense;
}

export async function updateExpense(id: string, updates: Record<string, any>, user: any) {
	const context = assertAdminContext(user);
	const existing = await ExpensesRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found");
	const updated = await ExpensesRepository.update(id, updates, context);

	await AuditService.logResourceChange({
		action: "EXPENSE_UPDATED",
		resourceType: "expense",
		resourceId: id,
		user,
		oldValues: { description: existing.description, value: existing.value },
		newValues: { description: updated.description, value: updated.value },
	});

	return updated;
}

export async function deleteExpense(id: string, user: any) {
	const context = assertAdminContext(user);
	const existing = await ExpensesRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found");
	await ExpensesRepository.remove(id, context);

	await AuditService.logResourceChange({
		action: "EXPENSE_DELETED",
		resourceType: "expense",
		resourceId: id,
		user,
		oldValues: { description: existing.description, value: existing.value },
	});

	return true;
}

export default {
	listExpenses,
	createExpense,
	updateExpense,
	deleteExpense,
};
