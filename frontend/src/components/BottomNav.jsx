import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Abas fixas para navegar entre as telas principais.
const baseTabs = [
	{ path: "/app", label: "Agenda", mark: "A" },
	{ path: "/services", label: "Serviços", mark: "S" },
	{ path: "/financial", label: "Caixa", mark: "$" },
	{ path: "/expenses", label: "Custos", mark: "D" },
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
				{ path: "/team", label: "Equipe", mark: "E" },
				...baseTabs.slice(1),
			]
		:	baseTabs;
	const gridClass = tabs.length === 5 ? "grid-cols-5" : "grid-cols-4";
	return (
		<nav className="sticky bottom-0 z-50 border-t border-border bg-background/95 px-3 pb-3 pt-2 backdrop-blur">
			<div
				className={`grid ${gridClass} gap-2 rounded-lg border border-border bg-background-deep p-1`}>
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
									"bg-secondary text-foreground shadow-sm"
								:	"text-foreground-faint hover:bg-secondary/50 hover:text-foreground"
							}`}>
							<span
								className={`flex h-5 w-5 items-center justify-center rounded-full font-mono-ui text-[10px] ${
									isActive ? "bg-paid text-primary-foreground" : "bg-card"
								}`}>
								{tab.mark}
							</span>
							<span className="font-mono-ui text-[10px] leading-none">
								{tab.label}
							</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
