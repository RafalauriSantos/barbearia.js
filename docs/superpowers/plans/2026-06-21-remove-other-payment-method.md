# Remove Other Payment Method Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the active `outro` payment option without deleting historical financial references.

**Architecture:** A forward-only migration deactivates existing `outro` rows and replaces the new-shop defaults trigger without that code. Bootstrap schema and repository defaults are aligned so clean installations and runtime sorting expose the same six operational methods.

**Tech Stack:** PostgreSQL, Knex migrations, Fastify repository layer, Tap tests.

## Global Constraints

- Preserve existing rows and historical foreign-key references.
- Do not return `outro` from active payment-method lists.
- Do not create `outro` for new barbershops.

---

### Task 1: Migration Contract

**Files:**
- Create: `backend/test/remove-other-payment-method.test.js`
- Create: `backend/db/migrations/202606210002_remove_other_payment_method.js`

**Interfaces:**
- Consumes: `public.formas_pagamento` and `public.criar_formas_pagamento_padrao()`.
- Produces: inactive historical `outro` rows and a six-method default trigger.

- [ ] **Step 1: Write the failing migration contract test**

Assert that the migration contains `WHERE codigo = 'outro'`, sets `ativo = false`, recreates `criar_formas_pagamento_padrao`, and does not insert an `outro` default.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --grep="remove other payment method"`

Expected: failure because the migration file does not exist.

- [ ] **Step 3: Implement the migration**

Use `knex.raw` to execute:

```sql
UPDATE public.formas_pagamento SET ativo = false WHERE codigo = 'outro';
CREATE OR REPLACE FUNCTION public.criar_formas_pagamento_padrao()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.formas_pagamento
    (barbearia_id, codigo, nome, taxa_percentual, ativo, ordem)
  VALUES
    (NEW.id, 'pix', 'Pix', 0, true, 10),
    (NEW.id, 'dinheiro', 'Dinheiro', 0, true, 20),
    (NEW.id, 'cartao_debito', 'Cartao de debito', 0, true, 30),
    (NEW.id, 'cartao_credito', 'Cartao de credito', 0, true, 40),
    (NEW.id, 'credito_parcelado', 'Credito parcelado', 0, true, 50),
    (NEW.id, 'fiado', 'Fiado', 0, true, 60)
  ON CONFLICT (barbearia_id, codigo) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

The down migration may reactivate historical `outro` rows and restore the seven-method trigger.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- --grep="remove other payment method"`

Expected: pass.

### Task 2: Bootstrap and Repository Alignment

**Files:**
- Modify: `backend/db/schema.sql`
- Modify: `backend/src/repositories/paymentMethodsRepository.js`
- Test: `backend/test/remove-other-payment-method.test.js`

**Interfaces:**
- Consumes: `DEFAULT_ORDER` and the bootstrap payment-method insert.
- Produces: no `outro` entry in clean schema or runtime defaults.

- [ ] **Step 1: Extend the contract test**

Read both files and assert they do not contain an `outro` payment-method declaration.

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- --grep="remove other payment method"`

Expected: failure while `schema.sql` and `DEFAULT_ORDER` still declare `outro`.

- [ ] **Step 3: Remove the declarations**

Delete `('outro', 'Outro', 0, 100)` from `schema.sql` and `outro: 100` from `DEFAULT_ORDER`.

- [ ] **Step 4: Run focused and full validation**

Run: `npm test -- --grep="remove other payment method"`, then `scripts/check-all.ps1` from the repository root.

Expected: all checks pass.

### Task 3: Supabase and Delivery

**Files:**
- Apply: `backend/db/migrations/202606210002_remove_other_payment_method.js`

**Interfaces:**
- Consumes: configured `DATABASE_URL`.
- Produces: no active `outro` methods in Supabase.

- [ ] **Step 1: Apply and verify the migration**

Run `npm run migrate` in `backend`, then query `formas_pagamento` for active rows with `codigo = 'outro'`.

Expected: migration succeeds and active count is `0`.

- [ ] **Step 2: Commit and push all pending files**

Stage the migration, tests, schema, repository, specification, and plan. Commit with a focused message and push `main` to `origin`.
