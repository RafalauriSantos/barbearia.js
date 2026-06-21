import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/context/AuthContext", () => ({
	useAuth: () => ({ user: { role: "admin" } }),
}));

import { BottomNav } from "@/components/BottomNav";

describe("BottomNav", () => {
	it("uses the minimal active treatment requested by the team mockup", () => {
		render(
			<MemoryRouter initialEntries={["/team"]}>
				<BottomNav variant="minimal" />
			</MemoryRouter>,
		);

		const activeTab = screen.getByRole("button", { name: "Equipe" });
		expect(activeTab.className).toContain("text-paid");
		expect(activeTab.className).not.toContain("bg-card");
		expect(screen.getByRole("navigation").dataset.variant).toBe("minimal");
	});
});
