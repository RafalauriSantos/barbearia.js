import { describe, expect, it } from "vitest";
import {
	parseMoneyInput,
	validateMoney,
	validateRequiredText,
	validateTime,
} from "./validation";

describe("validation helpers", () => {
	it("parses money with comma or dot", () => {
		expect(parseMoneyInput("45,90")).toBe(45.9);
		expect(parseMoneyInput("45.90")).toBe(45.9);
	});

	it("rejects invalid required text", () => {
		expect(validateRequiredText("", "Cliente")).toBe("Cliente e obrigatorio.");
		expect(validateRequiredText("A", "Cliente")).toBe(
			"Cliente deve ter pelo menos 2 caracteres.",
		);
	});

	it("rejects invalid money values", () => {
		expect(validateMoney("", "Valor")).toBe("Valor deve ser um valor valido.");
		expect(validateMoney("0", "Valor")).toBe("Valor deve ser maior que zero.");
		expect(validateMoney("10000", "Valor", { max: 9999.99 })).toBe(
			"Valor deve ser menor ou igual a R$ 9999.99.",
		);
	});

	it("validates time values", () => {
		expect(validateTime("09:30")).toBe("");
		expect(validateTime("")).toBe("Horario deve ser informado.");
	});
});
