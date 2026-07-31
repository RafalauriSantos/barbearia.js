export function parseMoneyInput(value: any): number {
	const normalized = String(value ?? "").trim().replace(",", ".");
	if (!normalized) return NaN;
	return Number(normalized);
}

export interface ValidateTextOptions {
	minLength?: number;
	maxLength?: number;
}

export function validateRequiredText(
	value: any,
	fieldLabel: string,
	options: ValidateTextOptions = {},
): string {
	const text = String(value ?? "").trim();
	const minLength = options.minLength ?? 2;
	const maxLength = options.maxLength ?? 80;

	if (!text) {
		return `${fieldLabel} e obrigatorio.`;
	}

	if (text.length < minLength) {
		return `${fieldLabel} deve ter pelo menos ${minLength} caracteres.`;
	}

	if (text.length > maxLength) {
		return `${fieldLabel} deve ter no maximo ${maxLength} caracteres.`;
	}

	return "";
}

export interface ValidateMoneyOptions {
	min?: number;
	max?: number;
}

export function validateMoney(
	value: any,
	fieldLabel: string,
	options: ValidateMoneyOptions = {},
): string {
	const amount = parseMoneyInput(value);
	const min = options.min ?? 0.01;
	const max = options.max ?? 99999.99;

	if (!Number.isFinite(amount)) {
		return `${fieldLabel} deve ser um valor valido.`;
	}

	if (amount < min) {
		return `${fieldLabel} deve ser maior que zero.`;
	}

	if (amount > max) {
		return `${fieldLabel} deve ser menor ou igual a R$ ${max.toFixed(2)}.`;
	}

	return "";
}

export function validateTime(value: any, fieldLabel = "Horario"): string {
	if (!/^\d{2}:\d{2}$/.test(String(value ?? ""))) {
		return `${fieldLabel} deve ser informado.`;
	}

	return "";
}
