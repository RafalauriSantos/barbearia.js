const ACCESS_TOKEN_KEY = "kash_flow_access_token";

function getStorage() {
	if (typeof window === "undefined") return null;
	return window.localStorage;
}

export function getAccessToken() {
	return getStorage()?.getItem(ACCESS_TOKEN_KEY) || "";
}

export function setAccessToken(token) {
	if (!token) return;
	getStorage()?.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
	getStorage()?.removeItem(ACCESS_TOKEN_KEY);
}
