import { apiClient } from "./client";

export async function listExpenses() {
	const response = await apiClient.get("/expenses");
	return response.data;
}

export async function listExpensesByDay(dayKey: string) {
	const response = await apiClient.get("/expenses", {
		params: { date: dayKey },
	});
	return response.data;
}

export async function listExpensesByPeriod(params: Record<string, any> = {}) {
	const response = await apiClient.get("/expenses", { params });
	return response.data;
}

export async function createExpense(expense: Record<string, any>) {
	const response = await apiClient.post("/expenses", expense);
	return response.data;
}

export async function updateExpenseById(id: string, updates: Record<string, any>) {
	const response = await apiClient.put(`/expenses/${id}`, updates);
	return response.data;
}

export async function deleteExpenseById(id: string): Promise<void> {
	await apiClient.delete(`/expenses/${id}`);
}
