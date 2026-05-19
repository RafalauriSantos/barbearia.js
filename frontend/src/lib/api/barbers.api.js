import { apiClient } from "./client";

function normalizeBarber(raw) {
	return {
		id: raw.id,
		name: raw.name || raw.nome || "",
		nome: raw.nome || raw.name || "",
		cargo: raw.cargo || "barbeiro",
		active: raw.active ?? raw.ativo ?? true,
		comissao_percent: Number(raw.comissao_percent || 0),
		email: raw.email || "",
		barbearia_id: raw.barbearia_id,
		usuario_id: raw.usuario_id || null,
		convite_pendente: raw.convite_pendente || null,
		access_status: raw.access_status || (raw.usuario_id ? "ativo" : "sem_acesso"),
		inviteUrl: raw.inviteUrl,
	};
}

export async function listBarbers() {
	const response = await apiClient.get("/barbers");
	return response.data.map(normalizeBarber);
}

export async function createBarber(payload) {
	const response = await apiClient.post("/barbers", payload);
	return normalizeBarber(response.data);
}

export async function updateBarber(id, payload) {
	const response = await apiClient.patch(`/barbers/${id}`, payload);
	return normalizeBarber(response.data);
}

export async function inviteBarber(id, payload) {
	const response = await apiClient.post(`/barbers/${id}/invite`, payload);
	return response.data;
}
