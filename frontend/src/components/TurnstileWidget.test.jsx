import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TurnstileWidget } from "./TurnstileWidget";

describe("TurnstileWidget Component", () => {
	it("renders widget container correctly", () => {
		render(<TurnstileWidget />);
		const container = screen.getByTestId("turnstile-container");
		expect(container).toBeTruthy();
	});

	it("triggers onSuccess callback in test environment", () => {
		const handleSuccess = vi.fn();
		render(<TurnstileWidget onSuccess={handleSuccess} />);
		expect(handleSuccess).toHaveBeenCalledWith("dummy-turnstile-token");
	});
});
