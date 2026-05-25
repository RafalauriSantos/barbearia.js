const ACCESS_TOKEN_KEY = "kash_flow_access_token";
const REFRESH_TOKEN_KEY = "kash_flow_refresh_token";

function getStorage() {
	if (typeof window === "undefined") return null;
	return window.localStorage;
}

export function getAccessToken() {
	return getStorage()?.getItem(ACCESS_TOKEN_KEY) || "";
}

export function getRefreshToken() {
	return getStorage()?.getItem(REFRESH_TOKEN_KEY) || "";
}

export function setAccessToken(token) {
	const storage = getStorage();
	if (!storage) return;
	if (!token) {
		storage.removeItem(ACCESS_TOKEN_KEY);
		return;
	}
	storage.setItem(ACCESS_TOKEN_KEY, token);
}

export function setRefreshToken(token) {
	const storage = getStorage();
	if (!storage) return;
	if (!token) {
		storage.removeItem(REFRESH_TOKEN_KEY);
		return;
	}
	storage.setItem(REFRESH_TOKEN_KEY, token);
}

export function setSessionTokens(session = {}) {
	setAccessToken(session.accessToken);
	setRefreshToken(session.refreshToken);
}

export function clearAccessToken() {
	getStorage()?.removeItem(ACCESS_TOKEN_KEY);
}

export function clearSessionTokens() {
	const storage = getStorage();
	if (!storage) return;
	storage.removeItem(ACCESS_TOKEN_KEY);
	storage.removeItem(REFRESH_TOKEN_KEY);
}
