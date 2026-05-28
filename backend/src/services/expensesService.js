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

exports.listExpenses = async function ({ date } = {}, user) {
	return ExpensesRepository.findAll({ date, ...getBarbeariaContext(user) });
};

exports.createExpense = async function (payload, user) {
	return ExpensesRepository.create(payload, getBarbeariaContext(user));
};

exports.updateExpense = async function (id, updates, user) {
	const context = getBarbeariaContext(user);
	const existing = await ExpensesRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found");
	return ExpensesRepository.update(id, updates, context);
};

exports.deleteExpense = async function (id, user) {
	const context = getBarbeariaContext(user);
	const existing = await ExpensesRepository.findById(id, context);
	if (!existing) throw new AppError(404, "NOT_FOUND", "Expense not found");
	await ExpensesRepository.remove(id, context);
	return true;
};
