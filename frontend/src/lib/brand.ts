export const APP_NAME = "Marque’s Barbearia";
export const LEGACY_APP_NAME = "Gestor Barbearia";

export function getBrandedShopName(shopName?: string | null): string {
	const normalized = String(shopName || "").trim();
	if (!normalized || normalized === LEGACY_APP_NAME) return APP_NAME;
	return normalized;
}
