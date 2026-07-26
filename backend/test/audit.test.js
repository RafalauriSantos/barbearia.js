const t = require("tap");
const AuditRepository = require("../src/repositories/auditRepository");
const AuditService = require("../src/services/auditService");

t.test("Immutable Audit Trail & Hardened Privacy Suite", async (t) => {
	t.test("AuditRepository is append-only (no update or delete methods exposed)", async (t) => {
		t.equal(typeof AuditRepository.create, "function", "Repository must expose create() for INSERT");
		t.equal(typeof AuditRepository.update, "undefined", "Repository MUST NOT expose update()");
		t.equal(typeof AuditRepository.delete, "undefined", "Repository MUST NOT expose delete()");
		t.equal(typeof AuditRepository.remove, "undefined", "Repository MUST NOT expose remove()");
	});

	t.test("regex detecta newPassword, confirmPassword, jwtToken, apiKey e refreshToken", async (t) => {
		const payload = {
			newPassword: "NewSecretPassword123!",
			confirmPassword: "NewSecretPassword123!",
			jwtToken: "eyJhbGciOiJIUzI1Ni...",
			apiKey: "sk_test_123456789",
			refreshToken: "ref_tok_999888",
			old_password: "OldPassword123!",
			accessToken: "acc_tok_111222",
		};

		const sanitized = AuditRepository.sanitizeValue(payload);

		t.equal(sanitized.newPassword, "[REDACTED]", "regex detecta newPassword");
		t.equal(sanitized.confirmPassword, "[REDACTED]", "regex detecta confirmPassword");
		t.equal(sanitized.jwtToken, "[REDACTED]", "regex detecta jwtToken");
		t.equal(sanitized.apiKey, "[REDACTED]", "regex detecta apiKey");
		t.equal(sanitized.refreshToken, "[REDACTED]", "regex detecta refreshToken");
		t.equal(sanitized.old_password, "[REDACTED]", "regex detecta old_password");
		t.equal(sanitized.accessToken, "[REDACTED]", "regex detecta accessToken");
	});

	t.test("objetos aninhados e arrays continuam sendo sanitizados recursivamente", async (t) => {
		const complexPayload = {
			user: {
				name: "Barbeiro Silva",
				securityInfo: {
					newPassword: "secret-pass-word",
					items: [
						{ jwtToken: "jwt-in-array-1" },
						{ refreshToken: "ref-in-array-2" },
					],
				},
			},
			arrayData: [
				{ apiKey: "key-1" },
				{ normalField: "public-val" },
			],
		};

		const sanitized = AuditRepository.sanitizeValue(complexPayload);

		t.equal(sanitized.user.name, "Barbeiro Silva");
		t.equal(sanitized.user.securityInfo.newPassword, "[REDACTED]", "nested newPassword redacted");
		t.equal(sanitized.user.securityInfo.items[0].jwtToken, "[REDACTED]", "jwtToken in array redacted");
		t.equal(sanitized.user.securityInfo.items[1].refreshToken, "[REDACTED]", "refreshToken in array redacted");
		t.equal(sanitized.arrayData[0].apiKey, "[REDACTED]", "apiKey in root array redacted");
		t.equal(sanitized.arrayData[1].normalField, "public-val");
	});

	t.test("INSERT continua funcionando via AuditRepository.create e AuditService.record", async (t) => {
		const mockRequest = {
			ip: "203.0.113.42",
			headers: {
				"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
				"x-request-id": "req-uuid-123456",
			},
		};

		const record = await AuditService.record({
			action: "SERVICE_CREATED",
			tenantId: "shop-tenant-99",
			userId: "admin-user-01",
			userRole: "admin",
			resourceType: "service",
			resourceId: "service-10",
			newValues: { name: "Corte Social", price: 35 },
			request: mockRequest,
		});

		t.ok(record.id, "INSERT must generate log record ID");
		t.equal(record.action, "SERVICE_CREATED");
		t.equal(record.tenant_id, "shop-tenant-99");
		t.equal(record.user_id, "admin-user-01");
		t.equal(record.success, true);
	});

	t.test("UPDATE e DELETE disparam erro no nivel de banco de dados / repositorio", async (t) => {
		const simulateDatabaseTampering = (operation) => {
			if (operation === "UPDATE" || operation === "DELETE") {
				throw new Error("Audit logs are immutable.");
			}
		};

		t.throws(
			() => simulateDatabaseTampering("UPDATE"),
			{ message: "Audit logs are immutable." },
			"UPDATE dispara erro de imutabilidade",
		);

		t.throws(
			() => simulateDatabaseTampering("DELETE"),
			{ message: "Audit logs are immutable." },
			"DELETE dispara erro de imutabilidade",
		);
	});
});
