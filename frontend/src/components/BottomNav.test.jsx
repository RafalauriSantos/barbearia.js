import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock } = vi.hoisted(() => ({
	useAuthMock: vi.fn(() => ({ user: { role: "admin" } })),
}));

vi.mock("@/context/AuthContext", () => ({
	useAuth: useAuthMock,
}));

import { BottomNav } from "@/components/BottomNav";

describe("BottomNav", () => {
	beforeEach(() => {
		useAuthMock.mockClear();
	});

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

	it("does not commit again when only the parent rerenders", () => {
		function Parent() {
			const [count, setCount] = useState(0);
			return (
				<>
					<button type="button" onClick={() => setCount((value) => value + 1)}>
						parent {count}
					</button>
					<BottomNav />
				</>
			);
		}

		render(
			<MemoryRouter initialEntries={["/app"]}>
				<Parent />
			</MemoryRouter>,
		);

		const initialCalls = useAuthMock.mock.calls.length;
		fireEvent.click(screen.getByRole("button", { name: /parent/i }));

		expect(useAuthMock).toHaveBeenCalledTimes(initialCalls);
	});
});
