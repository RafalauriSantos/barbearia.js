const ExpensesRepository = require("../repositories/expensesRepository");
const { AppError } = require("../lib/errors");

function getBarbeariaContext(user) {
	if (!user?.barbearia_id) {
		throw new AppError(
			403,
			"BARBEARIA_CONTEXT_REQUIRED",
			"Usuario sem barbearia vinculada.",
		);
	}
	return { barbeariaId: user.barbearia_id };
}

function assertAdminContext(user) {
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

exports.listExpenses = async function ({ date, start_date, end_date } = {}, user) {
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
};

exports.createExpense = async function (payload, user) {
	return ExpensesRepository.create(payload, assertAdminContext(user));
};

exports.updateExpense = async function (id, updates, user) {
	const context = assertAdminContext(user);
	const existing = await ExpensesRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found");
	return ExpensesRepository.update(id, updates, context);
};

exports.deleteExpense = async function (id, user) {
	const context = assertAdminContext(user);
	const existing = await ExpensesRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found");
	await ExpensesRepository.remove(id, context);
	return true;
};
