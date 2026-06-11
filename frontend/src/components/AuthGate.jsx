import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";

function SessionLoading() {
	return (
		<div className="app-shell flex items-center justify-center bg-background px-4">
			<div className="w-full max-w-md rounded-lg border border-border bg-card p-4">
				<p className="font-mono-ui text-[10px] uppercase text-foreground-faint">
					Validando sessão
				</p>
				<div className="mt-3 h-3 rounded bg-muted" />
				<div className="mt-2 h-3 w-2/3 rounded bg-muted" />
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

export default function AuthGate({ requireAuth = false }) {
	const content = <Outlet />;

	return (
		<AuthProvider>
			{requireAuth ? <RequireAuth>{content}</RequireAuth> : content}
		</AuthProvider>
	);
}
