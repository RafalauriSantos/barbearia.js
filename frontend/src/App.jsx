import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
	useLocation,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LoadingCard } from "@/components/ScreenPrimitives";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AppPage = lazy(() => import("./pages/AppPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const FinancialPage = lazy(() => import("./pages/FinancialPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const VerifyCodePage = lazy(() => import("./pages/VerifyCodePage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));

function SessionLoading() {
	return (
		<div className="app-shell flex min-h-[100dvh] items-center justify-center bg-background px-4">
			<div className="w-full max-w-md">
				<LoadingCard label="Validando sessão" rows={2} />
			</div>
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
	if (isAuthenticated) return <Navigate to="/app" replace />;

	return <LandingPage />;
}

function AppRoutes() {
	return (
		<Suspense fallback={<SessionLoading />}>
			<Routes>
				<Route path="/" element={<HomeRedirect />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/verify-email" element={<VerifyEmailPage />} />
				<Route path="/verify-code" element={<VerifyCodePage />} />
				<Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
		</Suspense>
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
