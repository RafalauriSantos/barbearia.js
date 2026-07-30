export type UserRole = "admin" | "barber";

export interface User {
	id: string;
	email: string;
	nome: string;
	role: UserRole;
	barbearia_id: string;
	foto_url?: string | null;
	tentativas_login_falhas?: number;
	bloqueado_ate?: string | null;
	created_at?: string;
	updated_at?: string;
}

export type AppointmentStatus = "pending" | "paid" | "fiado" | "confirmado";

export interface Appointment {
	id: string;
	client_name: string;
	client_phone?: string;
	barber_id: string;
	time_slot: string;
	value: number;
	status: AppointmentStatus;
	services?: string[];
	notes?: string;
	payment_method_id?: string | null;
	prazo_date?: string | null;
	created_at?: string;
	updated_at?: string;
}

export interface ClientRecord {
	id: string;
	nome: string;
	telefone?: string;
	barbeiro_id?: string;
	tipo_corte?: string;
	dia_corte_fixo?: number | null;
	observacao?: string;
	ultimo_corte?: string | null;
	valor_fixo?: number | null;
	forma_pagamento_preferida?: string | null;
	criado_em?: string;
}

export interface Expense {
	id: string;
	descricao: string;
	valor: number;
	data: string;
	categoria?: string;
	responsavel_id?: string;
	barbearia_id?: string;
	created_at?: string;
}

export interface FinancialSummary {
	totalReceived: number;
	toCollect: number;
	totalExpenses: number;
	netTotal: number;
	appointmentCount: number;
}

export interface PaymentMethod {
	id: string;
	nome: string;
	taxa_percentual?: number;
	ativo?: boolean;
}

export interface ServiceItem {
	id: string;
	nome: string;
	preco: number;
	duracao_minutos?: number;
	descricao?: string;
}
