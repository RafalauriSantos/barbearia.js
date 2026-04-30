export function parseMoneyInput(value) {
	const normalized = String(value ?? "").trim().replace(",", ".");
	if (!normalized) return NaN;
	return Number(normalized);
}

export function validateRequiredText(value, fieldLabel, options = {}) {
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

export function validateMoney(value, fieldLabel, options = {}) {
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

export function validateTime(value, fieldLabel = "Horario") {
	if (!/^\d{2}:\d{2}$/.test(String(value ?? ""))) {
		return `${fieldLabel} deve ser informado.`;
	}

	return "";
}
