import { apiClient } from "./client";

function normalizeNumber(value: any): number {
	return Number(value || 0);
}

export interface BarberSummary {
	barbeiro_id: string;
	nome: string;
	total_pago: number;
	total_taxas: number;
	total_liquido: number;
	comissao_percent: number;
	parte_barbeiro: number;
	parte_barbearia: number;
	quantidade_atendimentos: number;
}

export interface PaymentMethodSummary {
	forma_pagamento_id: string | null;
	codigo: string;
	nome: string;
	total_pago: number;
	total_taxas: number;
	total_liquido: number;
	quantidade_atendimentos: number;
}

export interface ProductFinancialRow {
	produto_id: string | null;
	nome: string;
	tipo_compra: string;
	fornecedor: string;
	quantidade: number;
	total_vendido: number;
	total_custo: number;
	total_lucro: number;
	fornecedor_pagar: number;
	comissao_barbeiro: number;
	lucro_barbearia: number;
}

export interface SupplierFinancialRow {
	fornecedor: string;
	quantidade: number;
	total_vendido: number;
	total_custo: number;
	total_lucro: number;
	fornecedor_pagar: number;
}

export interface ProductSummary {
	quantidade: number;
	total_vendido: number;
	total_custo: number;
	total_lucro: number;
	total_fornecedor_pagar: number;
	total_comissao_barbeiros: number;
	total_lucro_barbearia: number;
	resumo_por_produto: ProductFinancialRow[];
	resumo_por_fornecedor: SupplierFinancialRow[];
}

export interface FinancialSummaryResult {
	type: "admin" | "barbeiro";
	total_pago_geral?: number;
	total_taxas?: number;
	total_liquido?: number;
	total_barbearia?: number;
	total_barbeiros?: number;
	quantidade_atendimentos_pagos?: number;
	resumo_por_barbeiro?: BarberSummary[];
	resumo_por_forma_pagamento: PaymentMethodSummary[];
	resumo_produtos: ProductSummary;
	[key: string]: any;
}

function normalizeBarberSummary(raw: any): BarberSummary {
	return {
		barbeiro_id: raw.barbeiro_id,
		nome: raw.nome || raw.name || "",
		total_pago: normalizeNumber(raw.total_pago),
		total_taxas: normalizeNumber(raw.total_taxas),
		total_liquido: normalizeNumber(raw.total_liquido || raw.total_pago),
		comissao_percent: normalizeNumber(raw.comissao_percent),
		parte_barbeiro: normalizeNumber(raw.parte_barbeiro),
		parte_barbearia: normalizeNumber(raw.parte_barbearia),
		quantidade_atendimentos: Number(raw.quantidade_atendimentos || 0),
	};
}

function normalizePaymentMethodSummary(raw: any): PaymentMethodSummary {
	return {
		forma_pagamento_id: raw.forma_pagamento_id || null,
		codigo: raw.codigo || "sem_forma",
		nome: raw.nome || "Sem forma",
		total_pago: normalizeNumber(raw.total_pago),
		total_taxas: normalizeNumber(raw.total_taxas),
		total_liquido: normalizeNumber(raw.total_liquido || raw.total_pago),
		quantidade_atendimentos: Number(raw.quantidade_atendimentos || 0),
	};
}

function normalizeProductFinancialRow(raw: any): ProductFinancialRow {
	return {
		produto_id: raw.produto_id || null,
		nome: raw.nome || "Produto",
		tipo_compra: raw.tipo_compra || "avista",
		fornecedor: raw.fornecedor || "Sem fornecedor",
		quantidade: Number(raw.quantidade || 0),
		total_vendido: normalizeNumber(raw.total_vendido),
		total_custo: normalizeNumber(raw.total_custo),
		total_lucro: normalizeNumber(raw.total_lucro),
		fornecedor_pagar: normalizeNumber(raw.fornecedor_pagar),
		comissao_barbeiro: normalizeNumber(raw.comissao_barbeiro),
		lucro_barbearia: normalizeNumber(raw.lucro_barbearia),
	};
}

function normalizeSupplierFinancialRow(raw: any): SupplierFinancialRow {
	return {
		fornecedor: raw.fornecedor || "Sem fornecedor",
		quantidade: Number(raw.quantidade || 0),
		total_vendido: normalizeNumber(raw.total_vendido),
		total_custo: normalizeNumber(raw.total_custo),
		total_lucro: normalizeNumber(raw.total_lucro),
		fornecedor_pagar: normalizeNumber(raw.fornecedor_pagar),
	};
}

function normalizeProductSummary(raw: any = {}): ProductSummary {
	return {
		quantidade: Number(raw.quantidade || 0),
		total_vendido: normalizeNumber(raw.total_vendido),
		total_custo: normalizeNumber(raw.total_custo),
		total_lucro: normalizeNumber(raw.total_lucro),
		total_fornecedor_pagar: normalizeNumber(raw.total_fornecedor_pagar),
		total_comissao_barbeiros: normalizeNumber(
			raw.total_comissao_barbeiros,
		),
		total_lucro_barbearia: normalizeNumber(raw.total_lucro_barbearia),
		resumo_por_produto: Array.isArray(raw.resumo_por_produto) ?
			raw.resumo_por_produto.map(normalizeProductFinancialRow)
		:	[],
		resumo_por_fornecedor: Array.isArray(raw.resumo_por_fornecedor) ?
			raw.resumo_por_fornecedor.map(normalizeSupplierFinancialRow)
		:	[],
	};
}

export function normalizeFinancialSummary(raw: any): FinancialSummaryResult {
	const paymentMethods = Array.isArray(raw.resumo_por_forma_pagamento) ?
		raw.resumo_por_forma_pagamento.map(normalizePaymentMethodSummary)
	:	[];
	const productSummary = normalizeProductSummary(raw.resumo_produtos);

	if (Array.isArray(raw.resumo_por_barbeiro)) {
		return {
			type: "admin",
			total_pago_geral: normalizeNumber(raw.total_pago_geral),
			total_taxas: normalizeNumber(raw.total_taxas),
			total_liquido: normalizeNumber(
				raw.total_liquido || raw.total_pago_geral,
			),
			total_barbearia: normalizeNumber(raw.total_barbearia),
			total_barbeiros: normalizeNumber(raw.total_barbeiros),
			quantidade_atendimentos_pagos: Number(
				raw.quantidade_atendimentos_pagos || 0,
			),
			resumo_por_barbeiro: raw.resumo_por_barbeiro.map(normalizeBarberSummary),
			resumo_por_forma_pagamento: paymentMethods,
			resumo_produtos: productSummary,
		};
	}

	return {
		type: "barbeiro",
		...normalizeBarberSummary(raw),
		resumo_por_forma_pagamento: paymentMethods,
		resumo_produtos: productSummary,
	};
}

export async function getFinancialSummary(params: Record<string, any> = {}): Promise<FinancialSummaryResult> {
	const response = await apiClient.get("/financial/summary", { params });
	return normalizeFinancialSummary(response.data);
}
