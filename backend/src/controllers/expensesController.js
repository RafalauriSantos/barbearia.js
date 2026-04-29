const ExpensesService = require("../services/expensesService");
const {
	validateCreateExpense,
	validateUpdateExpense,
} = require("../validators/expenses.schema");

exports.list = async (request, reply) => {
	const expenses = await ExpensesService.listExpenses(request.query || {});
	return reply.send(expenses);
};

exports.create = async (request, reply) => {
	const payload = validateCreateExpense(request.body);
	const created = await ExpensesService.createExpense(payload);
	return reply.code(201).send(created);
};

exports.update = async (request, reply) => {
	const payload = validateUpdateExpense(request.body);
	const updated = await ExpensesService.updateExpense(request.params.id, payload);
	return reply.send(updated);
};

exports.remove = async (request, reply) => {
	await ExpensesService.deleteExpense(request.params.id);
	return reply.code(204).send();
};
