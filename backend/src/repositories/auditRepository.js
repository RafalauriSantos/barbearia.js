const supabase = require("../lib/supabase");

const SENSITIVE_KEYS = new Set([
	"password",
	"senha",
	"password_hash",
	"senha_hash",
	"token",
	"jwt",
	"access_token",
	"refreshtoken",
	"refresh_token",
	"code",
	"resetcode",
	"reset_code",
	"otp",
	"turnstiletoken",
	"turnstile_token",
	"cf_turnstile_response",
	"authorization",
	"secret",
	"private_key",
	"credentials",
	"apikey",
	"api_key",
]);

/**
 * Deeply redacts sensitive credentials and secret keys from audit log objects.
 */
function sanitizeValue(value) {
	if (!value || typeof value !== "object") return value;
	if (Array.isArray(value)) return value.map(sanitizeValue);

	const sanitized = {};
	for (const [key, val] of Object.entries(value)) {
		if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
			sanitized[key] = "[REDACTED]";
		} else if (typeof val === "object" && val !== null) {
			sanitized[key] = sanitizeValue(val);
		} else {
			sanitized[key] = val;
		}
	}
	return sanitized;
}

/**
 * Appends an immutable audit log record to PostgreSQL.
 * NO UPDATE or DELETE methods are exposed by this repository.
 */
exports.create = async function ({
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
}) {
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
	} catch (err) {
		console.warn("Audit Log DB exception:", err.message);
		return { id: "audit-mock-id", created_at: new Date().toISOString(), ...row };
	}
};

exports.findAllByTenant = async function (tenantId, { limit = 100 } = {}) {
	const { data, error } = await supabase
		.from("audit_logs")
		.select("*")
		.eq("tenant_id", tenantId)
		.order("created_at", { ascending: false })
		.limit(limit);
	if (error) throw error;
	return data || [];
};

exports.sanitizeValue = sanitizeValue;
