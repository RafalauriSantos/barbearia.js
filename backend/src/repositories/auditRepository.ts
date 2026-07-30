const supabase = require("../lib/supabase");

const SENSITIVE_KEY_PATTERN =
	/password|passwd|senha|token|jwt|bearer|otp|code|authorization|secret|api_key|apikey|key|private_key|credentials|access_token|refresh_token|turnstile|cf_turnstile/i;

function isSensitiveKey(key: string): boolean {
	if (!key || typeof key !== "string") return false;
	return SENSITIVE_KEY_PATTERN.test(key);
}

export function sanitizeValue(value: unknown): unknown {
	if (!value || typeof value !== "object") return value;
	if (Array.isArray(value)) return value.map(sanitizeValue);

	const sanitized: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
		if (isSensitiveKey(key)) {
			sanitized[key] = "[REDACTED]";
		} else if (typeof val === "object" && val !== null) {
			sanitized[key] = sanitizeValue(val);
		} else {
			sanitized[key] = val;
		}
	}
	return sanitized;
}

export interface AuditLogCreatePayload {
	tenantId?: string | null;
	userId?: string | null;
	userRole?: string | null;
	action: string;
	resourceType?: string | null;
	resourceId?: string | number | null;
	oldValues?: unknown;
	newValues?: unknown;
	ipAddress?: string | null;
	userAgent?: string | null;
	requestId?: string | null;
	success?: boolean;
	failureReason?: string | null;
	metadata?: Record<string, unknown>;
}

export async function create({
	tenantId,
	userId,
	userRole,
	action,
	resourceType,
	resourceId,
	oldValues,
	newValues,
	ipAddress,
	userAgent,
	requestId,
	success = true,
	failureReason = null,
	metadata = {},
}: AuditLogCreatePayload) {
	const row = {
		tenant_id: tenantId || null,
		user_id: userId || null,
		user_role: userRole || null,
		action,
		resource_type: resourceType || null,
		resource_id: resourceId ? String(resourceId) : null,
		old_values: oldValues ? sanitizeValue(oldValues) : null,
		new_values: newValues ? sanitizeValue(newValues) : null,
		ip_address: ipAddress || null,
		user_agent: userAgent ? String(userAgent).slice(0, 500) : null,
		request_id: requestId || null,
		success: Boolean(success),
		failure_reason: failureReason || null,
		metadata: sanitizeValue(metadata || {}),
	};

	try {
		const { data, error } = await supabase
			.from("audit_logs")
			.insert(row)
			.select("id, created_at, action, success")
			.single();

		if (error) {
			console.warn("Audit Log DB insert error:", error.message);
			return { id: "audit-mock-id", created_at: new Date().toISOString(), ...row };
		}
		return data;
	} catch (err: any) {
		console.warn("Audit Log DB exception:", err.message);
		return { id: "audit-mock-id", created_at: new Date().toISOString(), ...row };
	}
}

export async function findAllByTenant(tenantId: string, { limit = 100 } = {}) {
	const { data, error } = await supabase
		.from("audit_logs")
		.select("*")
		.eq("tenant_id", tenantId)
		.order("created_at", { ascending: false })
		.limit(limit);
	if (error) throw error;
	return data || [];
}

module.exports = {
	create,
	findAllByTenant,
	sanitizeValue,
};
