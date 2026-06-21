# Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tenant-sensitive payment and appointment writes isolated, atomic and covered by browser automation.

**Architecture:** A Postgres migration owns tenant constraints and atomic appointment RPCs. Fastify validates authorization and maps domain errors; Playwright covers browser workflows while the live smoke gate verifies deployed services.

**Tech Stack:** Node.js, Fastify, Supabase/Postgres, Knex migrations, React/Vite, Vitest, TAP, Playwright.

## Global Constraints

- Preserve existing API response shapes.
- Do not expose service keys, tokens or SQL errors.
- All behavior changes use a red-green TDD cycle.
- Existing production data must be migrated without deleting appointments or financial history.

---

### Task 1: Tenant-scoped payment methods

**Files:**
- Create: `backend/db/migrations/202606210001_tenant_atomic_appointments.js`
- Modify: `backend/src/repositories/paymentMethodsRepository.js`
- Modify: `backend/src/services/paymentMethodsService.js`
- Test: `backend/test/payment-method-tenancy.test.js`

**Interfaces:**
- `findAll({ barbeariaId, includeInactive })`
- `findById(id, { barbeariaId })`
- `update(id, updates, { barbeariaId })`

- [ ] Write failing tests proving every payment method query/update carries `barbeariaId`.
- [ ] Run `node node_modules/tap/bin/run.js --no-coverage test/payment-method-tenancy.test.js` and verify tenant assertions fail.
- [ ] Add migration SQL that clones global rows per shop, rewires references, adds `(barbearia_id, codigo)` uniqueness, composite foreign keys, and a new-shop default trigger.
- [ ] Scope repository queries and service calls by `user.barbearia_id`.
- [ ] Re-run the targeted test and verify it passes.

### Task 2: Canonical catalog validation

**Files:**
- Modify: `backend/src/services/appointmentsService.js`
- Modify: `backend/src/repositories/appointmentsRepository.js`
- Test: `backend/test/appointments-auth.test.js`

**Interfaces:**
- `resolveCatalogItems(payload, barbeariaId)` returns canonical `services` and `products` with request quantities only.
- Appointment repository context includes `{ barbeariaId, barbeiroId, userId }`.

- [ ] Add failing tests for foreign-shop service/product IDs and manipulated prices/costs.
- [ ] Run the targeted appointment service tests and verify the new assertions fail.
- [ ] Resolve each item through `ServicesRepository.findById` or `ProductsRepository.findById` with `barbeariaId`; reject missing items with `CATALOG_ITEM_INVALID`.
- [ ] Replace request snapshot fields with catalog fields while preserving validated quantity.
- [ ] Re-run targeted tests and verify they pass.

### Task 3: Atomic appointment RPC

**Files:**
- Modify: `backend/db/migrations/202606210001_tenant_atomic_appointments.js`
- Modify: `backend/src/repositories/appointmentsRepository.js`
- Modify: `backend/src/services/appointmentsService.js`
- Test: `backend/test/appointments-repository.test.js`
- Test: `backend/test/appointments-auth.test.js`
- Create: `backend/test/atomic-appointment-migration.test.js`

**Interfaces:**
- RPC `salvar_agendamento_atomico(p_agendamento jsonb, p_servicos jsonb, p_produtos jsonb, p_usuario_id uuid) returns uuid`.
- RPC `excluir_agendamento_atomico(p_agendamento_id uuid, p_barbearia_id uuid) returns boolean`.

- [ ] Add failing repository and migration contract tests for one-RPC writes, stock rejection and financial synchronization SQL.
- [ ] Run targeted tests and verify the old multi-write repository fails them.
- [ ] Implement RPC SQL to lock products, restore/reapply stock, write canonical snapshots, sync receivable/payables and roll back on any exception.
- [ ] Replace repository create/update/remove multi-write paths with RPC calls and map missing-RPC/stock errors to domain errors.
- [ ] Remove post-write financial synchronization from `appointmentsService` because it is now inside the transaction.
- [ ] Re-run targeted and complete backend tests.

### Task 4: Playwright critical-flow suite

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/playwright.config.js`
- Create: `frontend/e2e/critical-flows.spec.js`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Script `npm run test:e2e:smoke`.
- Playwright projects `desktop-chromium` and `mobile-chromium`.

- [ ] Install `@playwright/test` and add the smoke script.
- [ ] Write failing browser tests for public entry, session expiry, invite double-click prevention, and paid/fiado agenda actions.
- [ ] Add deterministic API route fixtures and stable accessible selectors where required.
- [ ] Run Playwright on desktop/mobile and verify all scenarios pass.
- [ ] Add Chromium installation and E2E execution to CI.

### Task 5: Migration, deployment and production verification

**Files:**
- Modify only if verification exposes a defect.

- [ ] Run backend tests, frontend tests, lint, build, `git diff --check`, and Playwright.
- [ ] Run `npm run migrate` in `backend` against the configured Supabase database and confirm migration status.
- [ ] Commit the implementation and push `main`.
- [ ] Poll `https://kurt-api.onrender.com/health` and `/health/db` until both return `200` with expected JSON.
- [ ] Poll `https://kurt-barbearia.vercel.app` until the new asset bundle is active.
- [ ] Run production public-route smoke checks and report any browser-only limitation explicitly.
