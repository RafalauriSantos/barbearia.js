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
	verifyEmailCode as verifyEmailCodeRequest,
	acceptInvite as acceptInviteRequest,
} from "@/lib/api/auth.api";
import {
	clearAppDataCache,
	configureAppDataCache,
	prefetchAppData,
} from "@/lib/store";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";

const AuthContext = createContext(null);
const AUTH_USER_SNAPSHOT_KEY = "gestor_barbearia_auth_user_v1";

function getStorage() {
	if (typeof window === "undefined") return null;
	return window.localStorage;
}

function readUserSnapshot() {
	const token = getAccessToken();
	if (!token) return null;

	try {
		const user = JSON.parse(
			getStorage()?.getItem(AUTH_USER_SNAPSHOT_KEY) || "null",
		);
		return user?.id ? user : null;
	} catch {
		return null;
	}
}

function writeUserSnapshot(user) {
	const storage = getStorage();
	if (!storage) return;

	if (!user?.id) {
		storage.removeItem(AUTH_USER_SNAPSHOT_KEY);
		return;
	}

	storage.setItem(AUTH_USER_SNAPSHOT_KEY, JSON.stringify(user));
}

function clearUserSnapshot() {
	getStorage()?.removeItem(AUTH_USER_SNAPSHOT_KEY);
}

export function AuthProvider({ children }) {
	const [user, setUser] = useState(() => {
		const cachedUser = readUserSnapshot();
		if (cachedUser) {
			configureAppDataCache(cachedUser);
		}
		return cachedUser;
	});
	const [isLoading, setIsLoading] = useState(() => {
		return Boolean(getAccessToken() && !readUserSnapshot());
	});

	const clearAuthenticatedState = useCallback(() => {
		clearAppDataCache();
		clearSessionTokens();
		clearUserSnapshot();
		setUser(null);
		setIsLoading(false);
	}, []);

	const loadCurrentUser = useCallback(async () => {
		const token = getAccessToken();
		if (!token) {
			setUser(null);
			clearUserSnapshot();
			setIsLoading(false);
			return null;
		}

		try {
			const currentUser = await fetchCurrentUser();
			configureAppDataCache(currentUser);
			writeUserSnapshot(currentUser);
			setUser(currentUser);
			void prefetchAppData(currentUser);
			return currentUser;
		} catch {
			clearAppDataCache();
			clearSessionTokens();
			clearUserSnapshot();
			setUser(null);
			return null;
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCurrentUser();
	}, [loadCurrentUser]);

	useEffect(() => {
		window.addEventListener(SESSION_EXPIRED_EVENT, clearAuthenticatedState);
		return () => {
			window.removeEventListener(
				SESSION_EXPIRED_EVENT,
				clearAuthenticatedState,
			);
		};
	}, [clearAuthenticatedState]);

	const login = useCallback(async ({ email, password }) => {
		const session = await loginRequest({ email, password });
		clearAppDataCache();
		clearUserSnapshot();
		setSessionTokens(session);
		const currentUser = await fetchCurrentUser();
		configureAppDataCache(currentUser);
		writeUserSnapshot(currentUser);
		setUser(currentUser);
		void prefetchAppData(currentUser);
		return currentUser;
	}, []);

	const signup = useCallback(
		async ({ email, password }) => {
			return registerRequest({ email, password });
		},
		[],
	);

	const verifyEmailCode = useCallback(async ({ email, code }) => {
		const session = await verifyEmailCodeRequest({ email, code });
		if (!session?.accessToken || !session?.refreshToken) {
			return session;
		}

		clearAppDataCache();
		clearUserSnapshot();
		setSessionTokens(session);
		const currentUser = await fetchCurrentUser();
		configureAppDataCache(currentUser);
		writeUserSnapshot(currentUser);
		setUser(currentUser);
		void prefetchAppData(currentUser);
		return { ...session, user: currentUser };
	}, []);

	const acceptInvite = useCallback(async ({ token, password, nome }) => {
		const session = await acceptInviteRequest(token, { password, nome });
		clearAppDataCache();
		clearUserSnapshot();
		setSessionTokens(session);
		const currentUser = await fetchCurrentUser();
		configureAppDataCache(currentUser);
		writeUserSnapshot(currentUser);
		setUser(currentUser);
		void prefetchAppData(currentUser);
		return currentUser;
	}, []);

	const logout = clearAuthenticatedState;

	const value = useMemo(
		() => ({
			user,
			isLoading,
			isAuthenticated: Boolean(user),
			login,
			signup,
			verifyEmailCode,
			acceptInvite,
			logout,
			reloadUser: loadCurrentUser,
		}),
		[
			user,
			isLoading,
			login,
			signup,
			verifyEmailCode,
			acceptInvite,
			logout,
			loadCurrentUser,
		],
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
