import {
	BrowserRouter,
	Route,
	Routes,
	useLocation,
} from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { warmUpApi } from "@/lib/api/client";
import LandingPage from "./pages/LandingPage";

const AuthGate = lazy(() => import("./components/AuthGate"));
const AppPage = lazy(() => import("./pages/AppPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const FinancialPage = lazy(() => import("./pages/FinancialPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const VerifyCodePage = lazy(() => import("./pages/VerifyCodePage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));

const SITE_URL = "https://kurt-barbearia.vercel.app";
const LANDING_TITLE =
	"Gestor Barbearia | Sistema de agenda e caixa para barbearias";
const LANDING_DESCRIPTION =
	"Sistema simples para barbearias controlarem agenda, caixa, equipe, produtos, despesas e fiados em um painel operacional.";

function upsertMeta(selector, attributes) {
	let element = document.head.querySelector(selector);
	if (!element) {
		element = document.createElement("meta");
		document.head.appendChild(element);
	}

	Object.entries(attributes).forEach(([key, value]) => {
		element.setAttribute(key, value);
	});
}

function upsertCanonical(href) {
	let element = document.head.querySelector("link[rel='canonical']");
	if (!element) {
		element = document.createElement("link");
		element.setAttribute("rel", "canonical");
		document.head.appendChild(element);
	}

	element.setAttribute("href", href);
}

function RouteSeo() {
	const { pathname } = useLocation();

	useEffect(() => {
		const isLanding = pathname === "/";
		const isDuplicateLanding = pathname === "/welcome";
		const robots = isLanding ? "index, follow" : "noindex, nofollow";
		const canonical = isLanding || isDuplicateLanding ? `${SITE_URL}/` : (
			`${SITE_URL}${pathname}`
		);
		const title =
			isLanding || isDuplicateLanding ? LANDING_TITLE : "Gestor Barbearia";

		document.title = title;
		upsertMeta("meta[name='description']", {
			name: "description",
			content: LANDING_DESCRIPTION,
		});
		upsertMeta("meta[name='robots']", {
			name: "robots",
			content: robots,
		});
		upsertMeta("meta[property='og:url']", {
			property: "og:url",
			content: canonical,
		});
		upsertMeta("meta[property='og:title']", {
			property: "og:title",
			content: title,
		});
		upsertMeta("meta[name='twitter:title']", {
			name: "twitter:title",
			content: title,
		});
		upsertCanonical(canonical);
	}, [pathname]);

	return null;
}

function RouteLoading() {
	return (
		<div className="app-shell flex items-center justify-center bg-background px-4">
			<div className="w-full max-w-md rounded-lg border border-border bg-card p-4">
				<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
					Carregando tela
				</p>
				<div className="mt-3 h-3 rounded bg-muted" />
				<div className="mt-2 h-3 w-2/3 rounded bg-muted" />
			</div>
		</div>
	);
}

function AppRoutes() {
	return (
		<Suspense fallback={<RouteLoading />}>
			<Routes>
				<Route path="/" element={<LandingPage />} />
				<Route path="/welcome" element={<LandingPage />} />
				<Route element={<AuthGate />}>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/verify-email" element={<VerifyEmailPage />} />
					<Route path="/verify-code" element={<VerifyCodePage />} />
					<Route path="/forgot-password" element={<ForgotPasswordPage />} />
					<Route path="/accept-invite" element={<AcceptInvitePage />} />
				</Route>
				<Route element={<AuthGate requireAuth />}>
					<Route path="/app" element={<AppPage />} />
					<Route path="/services" element={<ServicesPage />} />
					<Route path="/clients" element={<ClientsPage />} />
					<Route path="/team" element={<TeamPage />} />
					<Route path="/financial" element={<FinancialPage />} />
					<Route path="/expenses" element={<ExpensesPage />} />
					<Route path="/settings" element={<SettingsPage />} />
				</Route>
				<Route path="*" element={<NotFound />} />
			</Routes>
		</Suspense>
	);
}

// Define as rotas principais do sistema.
// Junta todas as telas e decide qual abrir por rota.
const App = () => {
	useEffect(() => {
		warmUpApi();
	}, []);

	return (
		<BrowserRouter>
			<RouteSeo />
			<AppRoutes />
		</BrowserRouter>
	);
};
export default App;
