const t = require("tap");
const AuditRepository = require("../src/repositories/auditRepository");
const AuditService = require("../src/services/auditService");

t.test("Immutable Audit Trail & Privacy Compliance Suite", async (t) => {
	t.test("AuditRepository is append-only (no update or delete methods exposed)", async (t) => {
		t.equal(typeof AuditRepository.create, "function", "Repository must expose create()");
		t.equal(typeof AuditRepository.update, "undefined", "Repository MUST NOT expose update()");
		t.equal(typeof AuditRepository.delete, "undefined", "Repository MUST NOT expose delete()");
		t.equal(typeof AuditRepository.remove, "undefined", "Repository MUST NOT expose remove()");
	});

	t.test("sanitizeValue deeply redacts sensitive keys (passwords, tokens, codes, secrets)", async (t) => {
		const rawPayload = {
			email: "barbeiro@exemplo.com",
			password: "SuperSecretPassword123!",
			token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
			turnstileToken: "0.123456789",
			code: "654321",
			secret: "super-secret-key",
			nested: {
				senha_hash: "$2a$10$abcdef...",
				refresh_token: "refresh-xyz-999",
				publicName: "Barbearia Silva",
			},
		};

		const sanitized = AuditRepository.sanitizeValue(rawPayload);

		t.equal(sanitized.email, "barbeiro@exemplo.com");
		t.equal(sanitized.password, "[REDACTED]", "password must be redacted");
		t.equal(sanitized.token, "[REDACTED]", "token must be redacted");
		t.equal(sanitized.turnstileToken, "[REDACTED]", "turnstileToken must be redacted");
		t.equal(sanitized.code, "[REDACTED]", "code must be redacted");
		t.equal(sanitized.secret, "[REDACTED]", "secret must be redacted");
		t.equal(sanitized.nested.senha_hash, "[REDACTED]", "nested.senha_hash must be redacted");
		t.equal(sanitized.nested.refresh_token, "[REDACTED]", "nested.refresh_token must be redacted");
		t.equal(sanitized.nested.publicName, "Barbearia Silva", "non-sensitive data must remain unchanged");
	});

	t.test("AuditService.record captures request context and tenant_id correctly", async (t) => {
		const mockRequest = {
			ip: "203.0.113.42",
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
				"x-request-id": "req-uuid-123456",
			},
		};

		const record = await AuditService.record({
			action: "BARBER_CREATED",
			tenantId: "shop-tenant-99",
			userId: "admin-user-01",
			userRole: "admin",
			resourceType: "barber",
			resourceId: "barber-77",
			newValues: { nome: "Carlos Barbeiro", comissao_percent: 50 },
			request: mockRequest,
		});

		t.ok(record.id, "Record should generate or mock ID");
		t.equal(record.action, "BARBER_CREATED");
		t.equal(record.tenant_id, "shop-tenant-99");
		t.equal(record.user_id, "admin-user-01");
		t.equal(record.user_role, "admin");
		t.equal(record.resource_type, "barber");
		t.equal(record.resource_id, "barber-77");
		t.equal(record.ip_address, "203.0.113.42");
		t.equal(record.user_agent, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
		t.equal(record.request_id, "req-uuid-123456");
		t.equal(record.success, true);
	});

	t.test("AuditService.logAuth correctly logs login failures with failure_reason", async (t) => {
		const record = await AuditService.record({
			action: "LOGIN_FAILED",
			resourceType: "user",
			success: false,
			failureReason: "Invalid credentials",
			metadata: { email: "usuario@teste.com", password: "should-be-redacted" },
		});

		t.equal(record.action, "LOGIN_FAILED");
		t.equal(record.success, false);
		t.equal(record.failure_reason, "Invalid credentials");
		t.equal(record.metadata.password, "[REDACTED]", "Sensitive fields in metadata must be redacted");
	});
});
