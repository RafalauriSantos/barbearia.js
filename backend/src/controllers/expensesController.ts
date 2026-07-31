const AuthService = require("../services/authService");
const ExpensesService = require("../services/expensesService");
const {
	validateCreateExpense,
	validateListExpensesQuery,
	validateUpdateExpense,
} = require("../validators/expenses.schema");

async function getCurrentUser(request: any) {
	return AuthService.getCurrentUser(request.user.userId);
}

export async function list(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const query = validateListExpensesQuery(request.query);
	const expenses = await ExpensesService.listExpenses(query, user);
	return reply.send(expenses);
}

export async function create(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateCreateExpense(request.body);
	const created = await ExpensesService.createExpense(payload, user);
	return reply.code(201).send(created);
}

export async function update(request: any, reply: any) {
	const user = await getCurrentUser(request);
	const payload = validateUpdateExpense(request.body);
	const updated = await ExpensesService.updateExpense(
		request.params.id,
		payload,
		user,
	);
	return reply.send(updated);
}

export async function remove(request: any, reply: any) {
	const user = await getCurrentUser(request);
	await ExpensesService.deleteExpense(request.params.id, user);
	return reply.code(204).send();
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	list,
	create,
	update,
	remove,
}; }
export default {
	list,
	create,
	update,
	remove,
};
