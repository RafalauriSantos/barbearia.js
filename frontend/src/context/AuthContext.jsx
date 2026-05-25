import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { clearSessionTokens, getAccessToken, setSessionTokens } from "@/lib/auth";
import {
	login as loginRequest,
	me as fetchCurrentUser,
	register as registerRequest,
	acceptInvite as acceptInviteRequest,
} from "@/lib/api/auth.api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	const loadCurrentUser = useCallback(async () => {
		const token = getAccessToken();
		if (!token) {
			setUser(null);
			setIsLoading(false);
			return null;
		}

		try {
			const currentUser = await fetchCurrentUser();
			setUser(currentUser);
			return currentUser;
		} catch {
			clearSessionTokens();
			setUser(null);
			return null;
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCurrentUser();
	}, [loadCurrentUser]);

	const login = useCallback(async ({ email, password }) => {
		const session = await loginRequest({ email, password });
		setSessionTokens(session);
		const currentUser = await fetchCurrentUser();
		setUser(currentUser);
		return currentUser;
	}, []);

	const signup = useCallback(
		async ({ email, password }) => {
			return registerRequest({ email, password });
		},
		[],
	);

	const acceptInvite = useCallback(async ({ token, password, nome }) => {
		const session = await acceptInviteRequest(token, { password, nome });
		setSessionTokens(session);
		const currentUser = await fetchCurrentUser();
		setUser(currentUser);
		return currentUser;
	}, []);

	const logout = useCallback(() => {
		clearSessionTokens();
		setUser(null);
	}, []);

	const value = useMemo(
		() => ({
			user,
			isLoading,
			isAuthenticated: Boolean(user),
			login,
			signup,
			acceptInvite,
			logout,
			reloadUser: loadCurrentUser,
		}),
		[user, isLoading, login, signup, acceptInvite, logout, loadCurrentUser],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used inside AuthProvider");
	}
	return context;
}
