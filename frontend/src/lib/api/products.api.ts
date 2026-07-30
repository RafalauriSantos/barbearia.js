import { apiClient } from "./client";

export async function listProducts() {
	const response = await apiClient.get("/products");
	return response.data;
}

export async function createProduct(product: Record<string, any>) {
	const response = await apiClient.post("/products", product);
	return response.data;
}

export async function updateProductById(id: string, updates: Record<string, any>) {
	const response = await apiClient.put(`/products/${id}`, updates);
	return response.data;
}

export async function deleteProductById(id: string): Promise<void> {
	await apiClient.delete(`/products/${id}`);
}
