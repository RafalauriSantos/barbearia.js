import { memo, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function NavIcon({ name }) {
	const common = {
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round",
		strokeLinejoin: "round",
	};
	const icons = {
		agenda: (
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
				<rect x="4" y="5" width="16" height="15" rx="2" {...common} />
				<path d="M8 3v4M16 3v4M4 10h16" {...common} />
			</svg>
		),
		team: (
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
				<path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4" {...common} />
				<circle cx="12" cy="9" r="3" {...common} />
				<path d="M4 18c0-1.7 1.3-3 3-3M20 18c0-1.7-1.3-3-3-3" {...common} />
				<path d="M7 11a2 2 0 1 1 0-4M17 11a2 2 0 1 0 0-4" {...common} />
			</svg>
		),
		clients: (
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
				<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" {...common} />
				<circle cx="9.5" cy="7" r="4" {...common} />
				<path d="M19 8v6M22 11h-6" {...common} />
			</svg>
		),
		services: (
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
				<path d="M12 5v14M5 12h14" {...common} />
			</svg>
		),
		cash: (
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
				<rect x="4" y="6" width="16" height="12" rx="2" {...common} />
				<circle cx="12" cy="12" r="2.5" {...common} />
				<path d="M7 9h1M16 15h1" {...common} />
			</svg>
		),
	};
	return icons[name] || null;
}

// Abas fixas para navegar entre as telas principais.
const baseTabs = [
	{ path: "/app", label: "Agenda", icon: "agenda" },
	{ path: "/clients", label: "Clientes", icon: "clients" },
	{ path: "/services", label: "Serviços", icon: "services" },
	{ path: "/financial", label: "Caixa", icon: "cash" },
];

// Barra fixa embaixo para trocar de tela.
export const BottomNav = memo(function BottomNav({ variant = "minimal" }) {
	const location = useLocation();
	const navigate = useNavigate();
	const { user } = useAuth();
	const [isKeyboardOrModalOpen, setIsKeyboardOrModalOpen] = useState(false);

	useEffect(() => {
		const checkHideState = () => {
			const activeTag = document.activeElement?.tagName?.toLowerCase();
			const isInputFocused =
				activeTag === "input" || activeTag === "textarea" || activeTag === "select";

			const vvHeight = window.visualViewport?.height;
			const winHeight = window.innerHeight;
			const isViewportReduced = Boolean(vvHeight && winHeight && vvHeight < winHeight - 120);

			const isModalOpen =
				document.body.style.overflow === "hidden" ||
				Boolean(
					document.querySelector(
						'[role="dialog"], [data-state="open"], .fixed.inset-0',
					),
				);

			setIsKeyboardOrModalOpen(Boolean(isInputFocused || isViewportReduced || isModalOpen));
		};

		checkHideState();

		const handleFocusChange = () => {
			requestAnimationFrame(checkHideState);
		};

		window.addEventListener("focusin", handleFocusChange);
		window.addEventListener("focusout", handleFocusChange);
		window.visualViewport?.addEventListener("resize", checkHideState);
		window.visualViewport?.addEventListener("scroll", checkHideState);

		const observer = new MutationObserver(checkHideState);
		observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });

		return () => {
			window.removeEventListener("focusin", handleFocusChange);
			window.removeEventListener("focusout", handleFocusChange);
			window.visualViewport?.removeEventListener("resize", checkHideState);
			window.visualViewport?.removeEventListener("scroll", checkHideState);
			observer.disconnect();
		};
	}, []);

	const isAdmin = user?.role === "admin";
	const tabs =
		isAdmin ?
			[
				baseTabs[0],
				{ path: "/team", label: "Equipe", icon: "team" },
				...baseTabs.slice(1),
			]
		:	baseTabs;
	const gridClass =
		tabs.length === 6 ? "grid-cols-6"
		: tabs.length === 5 ? "grid-cols-5"
		: "grid-cols-4";

	if (isKeyboardOrModalOpen) return null;

	return (
		<nav data-variant={variant} className="tabbar">
			{tabs.map((tab) => {
				const isActive = location.pathname === tab.path;
				return (
					<button
						key={tab.path}
						type="button"
						onClick={() => navigate(tab.path)}
						aria-current={isActive ? "page" : undefined}
						className={`tab ${isActive ? "active text-paid" : ""}`}>
						<div className="tab-icon">
							<NavIcon name={tab.icon} />
						</div>
						{tab.label}
					</button>
				);
			})}
		</nav>
	);
});
