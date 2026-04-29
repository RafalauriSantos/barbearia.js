import { apiClient } from "./client";

export async function listExpenses() {
	const response = await apiClient.get("/expenses");
	return response.data;
}

export async function listExpensesByDay(dayKey) {
	const response = await apiClient.get("/expenses", {
		params: { date: dayKey },
	});
	return response.data;
}

export async function createExpense(expense) {
	const response = await apiClient.post("/expenses", expense);
	return response.data;
}

export async function updateExpenseById(id, updates) {
	const response = await apiClient.put(`/expenses/${id}`, updates);
	return response.data;
}

export async function deleteExpenseById(id) {
	await apiClient.delete(`/expenses/${id}`);
}
