import { apiClient } from "./client";

export interface ApiBarber {
	id: string;
	name: string;
	nome: string;
	cargo: string;
	active: boolean;
	comissao_percent: number;
	email: string;
	photo_url: string;
	foto_url: string;
	barbearia_id?: string;
	usuario_id?: string | null;
	convite_pendente?: any;
	access_status: string;
	inviteUrl?: string;
}

function normalizeBarber(raw: any): ApiBarber {
	return {
		id: raw.id,
		name: raw.name || raw.nome || "",
		nome: raw.nome || raw.name || "",
		cargo: raw.cargo || "barbeiro",
		active: raw.active ?? raw.ativo ?? true,
		comissao_percent: Number(raw.comissao_percent || 0),
		email: raw.email || "",
		photo_url: raw.photo_url || raw.foto_url || "",
		foto_url: raw.foto_url || raw.photo_url || "",
		barbearia_id: raw.barbearia_id,
		usuario_id: raw.usuario_id || null,
		convite_pendente: raw.convite_pendente || null,
		access_status: raw.access_status || (raw.usuario_id ? "ativo" : "sem_acesso"),
		inviteUrl: raw.inviteUrl,
	};
}

export async function listBarbers(): Promise<ApiBarber[]> {
	const response = await apiClient.get("/barbers");
	return response.data.map(normalizeBarber);
}

export async function createBarber(payload: Record<string, any>): Promise<ApiBarber> {
	const response = await apiClient.post("/barbers", payload);
	return normalizeBarber(response.data);
}

export async function updateBarber(id: string, payload: Record<string, any>): Promise<ApiBarber> {
	const response = await apiClient.patch(`/barbers/${id}`, payload);
	return normalizeBarber(response.data);
}

export async function inviteBarber(id: string, payload?: Record<string, any>): Promise<any> {
	const response = await apiClient.post(`/barbers/${id}/invite`, payload);
	return response.data;
}

export async function removeBarber(id: string): Promise<any> {
	const response = await apiClient.delete(`/barbers/${id}`);
	return response.data;
}
