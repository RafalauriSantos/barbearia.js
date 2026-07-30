const ACCESS_TOKEN_KEY = "gestor_barbearia_access_token";
const REFRESH_TOKEN_KEY = "gestor_barbearia_refresh_token";
const LEGACY_ACCESS_TOKEN_KEY = "kash_flow_access_token";
const LEGACY_REFRESH_TOKEN_KEY = "kash_flow_refresh_token";

export interface SessionTokens {
	accessToken?: string;
	refreshToken?: string;
}

function getStorage(): Storage | null {
	if (typeof window === "undefined") return null;
	return window.localStorage;
}

export function getAccessToken(): string {
	const storage = getStorage();
	if (!storage) return "";
	return (
		storage.getItem(ACCESS_TOKEN_KEY) ||
		storage.getItem(LEGACY_ACCESS_TOKEN_KEY) ||
		""
	);
}

export function getRefreshToken(): string {
	const storage = getStorage();
	if (!storage) return "";
	return (
		storage.getItem(REFRESH_TOKEN_KEY) ||
		storage.getItem(LEGACY_REFRESH_TOKEN_KEY) ||
		""
	);
}

export function setAccessToken(token?: string | null): void {
	const storage = getStorage();
	if (!storage) return;
	if (!token) {
		storage.removeItem(ACCESS_TOKEN_KEY);
		storage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
		return;
	}
	storage.setItem(ACCESS_TOKEN_KEY, token);
	storage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}

export function setRefreshToken(token?: string | null): void {
	const storage = getStorage();
	if (!storage) return;
	if (!token) {
		storage.removeItem(REFRESH_TOKEN_KEY);
		storage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
		return;
	}
	storage.setItem(REFRESH_TOKEN_KEY, token);
	storage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function setSessionTokens(session: SessionTokens = {}): void {
	setAccessToken(session.accessToken);
	setRefreshToken(session.refreshToken);
}

export function clearAccessToken(): void {
	const storage = getStorage();
	if (!storage) return;
	storage.removeItem(ACCESS_TOKEN_KEY);
	storage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}

export function clearSessionTokens(): void {
	const storage = getStorage();
	if (!storage) return;
	storage.removeItem(ACCESS_TOKEN_KEY);
	storage.removeItem(REFRESH_TOKEN_KEY);
	storage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
	storage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}
