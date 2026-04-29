const ExpensesRepository = require("../repositories/expensesRepository");
const { AppError } = require("../lib/errors");

exports.listExpenses = async function ({ date } = {}) {
	return ExpensesRepository.findAll({ date });
};

exports.createExpense = async function (payload) {
	return ExpensesRepository.create(payload);
};

exports.updateExpense = async function (id, updates) {
	const existing = await ExpensesRepository.findById(id);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found");
	return ExpensesRepository.update(id, updates);
};

exports.deleteExpense = async function (id) {
	const existing = await ExpensesRepository.findById(id);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found");
	await ExpensesRepository.remove(id);
	return true;
};
