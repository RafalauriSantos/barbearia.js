const AuthService = require("../services/authService");
const ExpensesService = require("../services/expensesService");
const {
	validateCreateExpense,
	validateUpdateExpense,
} = require("../validators/expenses.schema");

async function getCurrentUser(request) {
	return AuthService.getCurrentUser(request.user.userId);
}

exports.list = async (request, reply) => {
	const user = await getCurrentUser(request);
	const expenses = await ExpensesService.listExpenses(request.query || {}, user);
	return reply.send(expenses);
};

exports.create = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateCreateExpense(request.body);
	const created = await ExpensesService.createExpense(payload, user);
	return reply.code(201).send(created);
};

exports.update = async (request, reply) => {
	const user = await getCurrentUser(request);
	const payload = validateUpdateExpense(request.body);
	const updated = await ExpensesService.updateExpense(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
};

exports.remove = async (request, reply) => {
	const user = await getCurrentUser(request);
	await ExpensesService.deleteExpense(request.params.id, user);
	return reply.code(204).send();
};
