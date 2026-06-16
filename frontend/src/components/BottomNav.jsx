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
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
				<rect x="4" y="5" width="16" height="15" rx="2" {...common} />
				<path d="M8 3v4M16 3v4M4 10h16" {...common} />
			</svg>
		),
		team: (
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
				<path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4" {...common} />
				<circle cx="12" cy="9" r="3" {...common} />
				<path d="M4 18c0-1.7 1.3-3 3-3M20 18c0-1.7-1.3-3-3-3" {...common} />
				<path d="M7 11a2 2 0 1 1 0-4M17 11a2 2 0 1 0 0-4" {...common} />
			</svg>
		),
		clients: (
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
				<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" {...common} />
				<circle cx="9.5" cy="7" r="4" {...common} />
				<path d="M19 8v6M22 11h-6" {...common} />
			</svg>
		),
		services: (
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
				<path d="M12 5v14M5 12h14" {...common} />
			</svg>
		),
		cash: (
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
				<rect x="4" y="6" width="16" height="12" rx="2" {...common} />
				<circle cx="12" cy="12" r="2.5" {...common} />
				<path d="M7 9h1M16 15h1" {...common} />
			</svg>
		),
		costs: (
			<svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
				<path d="M5 7h14M7 7l1 13h8l1-13M10 11v5M14 11v5M10 4h4l1 3H9l1-3Z" {...common} />
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
	{ path: "/expenses", label: "Custos", icon: "costs" },
];

// Barra fixa embaixo para trocar de tela.
export function BottomNav() {
	const location = useLocation();
	const navigate = useNavigate();
	const { user } = useAuth();
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
	return (
		<nav className="sticky bottom-0 z-50 shrink-0 border-t border-border bg-background/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
			<div
				className={`mx-auto grid ${gridClass} max-w-[860px] gap-1 rounded-lg border border-border bg-background-deep p-1`}>
				{tabs.map((tab) => {
					// Marca visualmente a aba ativa.
					const isActive = location.pathname === tab.path;
					return (
						<button
							key={tab.path}
							onClick={() => navigate(tab.path)}
							aria-current={isActive ? "page" : undefined}
							className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 transition-colors ${
								isActive ?
									"bg-card text-foreground shadow-sm"
								:	"text-foreground-faint hover:bg-secondary/50 hover:text-foreground"
							}`}>
							<span
								className={`flex h-5 w-5 items-center justify-center rounded-full ${
									isActive ?
										"bg-paid text-primary-foreground"
									:	"bg-transparent text-foreground-faint"
								}`}>
								<NavIcon name={tab.icon} />
							</span>
							<span className="font-mono-ui text-[9px] leading-none sm:text-[10px]">
								{tab.label}
							</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
