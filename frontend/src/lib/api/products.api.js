import { apiClient } from "./client";

export async function listProducts() {
	const response = await apiClient.get("/products");
	return response.data;
}

export async function createProduct(product) {
	const response = await apiClient.post("/products", product);
	return response.data;
}

export async function updateProductById(id, updates) {
	const response = await apiClient.put(`/products/${id}`, updates);
	return response.data;
}

export async function deleteProductById(id) {
	await apiClient.delete(`/products/${id}`);
}
