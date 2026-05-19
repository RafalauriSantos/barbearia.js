import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
	useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import LandingPage from "./pages/LandingPage";
import AppPage from "./pages/AppPage";
import SettingsPage from "./pages/SettingsPage";
import ServicesPage from "./pages/ServicesPage";
import FinancialPage from "./pages/FinancialPage";
import ExpensesPage from "./pages/ExpensesPage";
import TeamPage from "./pages/TeamPage";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";

function SessionLoading() {
	return (
		<div className="app-shell min-h-[100dvh] bg-background flex items-center justify-center px-6">
			<p className="font-mono-ui text-xs text-foreground-faint">
				VALIDANDO SESSAO
			</p>
		</div>
	);
}

function RequireAuth({ children }) {
	const { isAuthenticated, isLoading } = useAuth();
	const location = useLocation();

	if (isLoading) return <SessionLoading />;
	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	return children;
}

function HomeRedirect() {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) return <SessionLoading />;
	return <Navigate to={isAuthenticated ? "/app" : "/login"} replace />;
}

function AppRoutes() {
	return (
		<Routes>
			<Route path="/" element={<HomeRedirect />} />
			<Route path="/login" element={<LoginPage />} />
			<Route path="/verify-email" element={<VerifyEmailPage />} />
			<Route path="/accept-invite" element={<AcceptInvitePage />} />
			<Route path="/welcome" element={<LandingPage />} />
			<Route
				path="/app"
				element={
					<RequireAuth>
						<AppPage />
					</RequireAuth>
				}
			/>
			<Route
				path="/services"
				element={
					<RequireAuth>
						<ServicesPage />
					</RequireAuth>
				}
			/>
			<Route
				path="/team"
				element={
					<RequireAuth>
						<TeamPage />
					</RequireAuth>
				}
			/>
			<Route
				path="/financial"
				element={
					<RequireAuth>
						<FinancialPage />
					</RequireAuth>
				}
			/>
			<Route
				path="/expenses"
				element={
					<RequireAuth>
						<ExpensesPage />
					</RequireAuth>
				}
			/>
			<Route
				path="/settings"
				element={
					<RequireAuth>
						<SettingsPage />
					</RequireAuth>
				}
			/>
			<Route path="*" element={<NotFound />} />
		</Routes>
	);
}

// Define as rotas principais do sistema.
// Junta todas as telas e decide qual abrir por rota.
const App = () => (
	<BrowserRouter>
		<AuthProvider>
			<AppRoutes />
		</AuthProvider>
	</BrowserRouter>
);
export default App;
