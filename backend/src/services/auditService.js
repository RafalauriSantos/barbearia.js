const AuditRepository = require("../repositories/auditRepository");

function extractContext(reqOrC) {
	if (!reqOrC) return { ipAddress: "127.0.0.1", userAgent: null, requestId: null };

	// Hono context
	if (typeof reqOrC.req?.header === "function") {
		return {
			ipAddress:
				reqOrC.req.header("CF-Connecting-IP") ||
				reqOrC.req.header("x-real-ip") ||
				reqOrC.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
				"127.0.0.1",
			userAgent: reqOrC.req.header("user-agent") || null,
			requestId: reqOrC.req.header("x-request-id") || reqOrC.req.header("cf-ray") || null,
		};
	}

	// Fastify request object
	const headers = reqOrC.headers || {};
	return {
		ipAddress:
			reqOrC.ip ||
			headers["cf-connecting-ip"] ||
			headers["x-real-ip"] ||
			headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
			"127.0.0.1",
		userAgent: headers["user-agent"] || null,
		requestId: reqOrC.id || reqOrC.reqId || headers["x-request-id"] || null,
	};
}

exports.record = async function ({
	tenantId,
	userId,
	userRole,
	action,
	resourceType,
	resourceId,
	oldValues,
	newValues,
	request,
	ipAddress,
	userAgent,
	requestId,
	success = true,
	failureReason = null,
	metadata = {},
}) {
	const reqCtx = extractContext(request);

	return AuditRepository.create({
		tenantId: tenantId || null,
		userId: userId || null,
		userRole: userRole || null,
		action,
		resourceType: resourceType || null,
		resourceId: resourceId ? String(resourceId) : null,
		oldValues: oldValues || null,
		newValues: newValues || null,
		ipAddress: ipAddress || reqCtx.ipAddress,
		userAgent: userAgent || reqCtx.userAgent,
		requestId: requestId || reqCtx.requestId,
		success: Boolean(success),
		failureReason: failureReason || null,
		metadata: metadata || {},
	});
};

exports.logAuth = async function ({
	action,
	user,
	tenantId,
	request,
	success = true,
	failureReason = null,
	metadata = {},
}) {
	return exports.record({
		action,
		tenantId: tenantId || user?.barbearia_id || null,
		userId: user?.id || null,
		userRole: user?.role || null,
		resourceType: "user",
		resourceId: user?.id || null,
		request,
		success,
		failureReason,
		metadata,
	});
};

exports.logResourceChange = async function ({
	action,
	resourceType,
	resourceId,
	user,
	request,
	oldValues,
	newValues,
	success = true,
	failureReason = null,
	metadata = {},
}) {
	return exports.record({
		action,
		tenantId: user?.barbearia_id || null,
		userId: user?.id || null,
		userRole: user?.role || null,
		resourceType,
		resourceId,
		oldValues,
		newValues,
		request,
		success,
		failureReason,
		metadata,
	});
};

exports.findAllByTenant = async function (tenantId, options) {
	return AuditRepository.findAllByTenant(tenantId, options);
};
