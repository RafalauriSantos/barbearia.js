# Production Hardening Design

## Objective

Eliminate cross-shop data access and partial appointment writes, then cover the critical user journey with browser automation and production smoke checks.

## Approved Scope

- Payment methods belong to one barbershop and keep independent fees.
- Appointment service/product identifiers must belong to the authenticated barbershop.
- Catalog names, prices, costs and commissions are read from the server-side catalog, never trusted from the request.
- Appointment, item snapshots, stock, receivable and supplier payable changes commit or roll back together.
- Automated browser coverage exercises registration/login, agenda payment actions and invitation UI without depending on production data.
- A live smoke gate verifies frontend, backend and database readiness after deployment.

## Architecture

### Tenant isolation

`formas_pagamento` receives `barbearia_id`, a per-shop unique key on `(barbearia_id, codigo)`, and composite foreign keys from appointments and receivables. Existing global methods are cloned per shop and historical references are reassigned. New shops receive defaults from a database trigger.

Appointment item tables receive `barbearia_id` and composite foreign keys to both the appointment and catalog item. This makes a cross-shop item impossible even if an application validation is bypassed.

### Atomic appointment writes

Postgres functions `salvar_agendamento_atomico` and `excluir_agendamento_atomico` own the write transaction. They lock affected products, restore previous stock, validate and subtract new quantities, write canonical item snapshots, synchronize linked receivables and supplier payables, and return the appointment identifier. Any exception rolls back the complete operation.

The Node repository performs one RPC call and then reads the saved appointment. The service layer still performs authorization and schedule conflict checks, but does not run financial synchronization after the RPC.

### Browser and deployment verification

Playwright runs deterministic critical UI scenarios against Vite with intercepted API responses. The existing live smoke script continues to validate the real local API and Supabase. Production verification checks Vercel, Render `/health`, Render `/health/db`, and the deployed static assets after GitHub push.

## Error Handling

- Cross-shop catalog or payment references return a domain `400`/`403`, not a database `500`.
- Insufficient stock returns `409 PRODUCT_STOCK_INSUFFICIENT`.
- Missing migration/RPC returns `409 APPOINTMENT_MIGRATION_REQUIRED`.
- Database exceptions are translated without exposing SQL or secrets.

## Test Strategy

- Repository/service unit tests prove tenant context is forwarded and client-supplied catalog snapshots are ignored.
- Migration contract tests assert the required functions, tenant keys and stock guard exist.
- Existing finance and appointment tests remain green.
- Playwright covers public entry, authentication state, invitation pending behavior, and paid/fiado agenda actions on desktop and mobile viewports.
- Final gate: backend tests, frontend tests, lint, production build, Playwright, live readiness and production readiness.

## Rollout

1. Commit the migration and backend changes.
2. Run the migration against Supabase before relying on the new RPC.
3. Push `main`; Render and Vercel deploy automatically.
4. Poll readiness and run production smoke checks.
5. Keep the previous checkpoint commit available for rollback.
