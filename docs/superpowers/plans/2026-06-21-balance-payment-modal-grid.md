# Balance Payment Modal Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the last payment-method button fill the empty row when the modal has an odd number of methods.

**Architecture:** `PaymentQuickSheet` already owns the filtered list and grid rendering. It will derive whether the list is odd and apply `col-span-2` only to the final button; no state, API, or payment behavior changes.

**Tech Stack:** React 18, Tailwind CSS, Vitest, Testing Library, Playwright.

## Global Constraints

- Keep the grid at two columns.
- Span the final button only when the method count is odd.
- Preserve selection, fee calculation, and confirmation behavior.

---

### Task 1: Responsive Payment Grid

**Files:**
- Modify: `frontend/src/pages/AppPage.jsx`
- Modify: `frontend/src/pages/AppPage.test.jsx`

**Interfaces:**
- Consumes: `availableMethods: PaymentMethod[]` inside `PaymentQuickSheet`.
- Produces: a final method button with `col-span-2` when `availableMethods.length` is odd.

- [ ] **Step 1: Write the failing UI test**

Load five non-fiado methods, open the payment sheet, locate the fifth button, and assert its class contains `col-span-2`.

- [ ] **Step 2: Verify the test fails**

Run: `npm test -- AppPage.test.jsx`

Expected: failure because the fifth button does not have `col-span-2`.

- [ ] **Step 3: Implement the minimal layout rule**

Change the map callback to receive `index` and append:

```jsx
index === availableMethods.length - 1 && availableMethods.length % 2 === 1
  ? "col-span-2"
  : ""
```

to the payment button class.

- [ ] **Step 4: Run frontend and browser validation**

Run `npm test -- AppPage.test.jsx`, `npm run lint -- --max-warnings=0`, and `npm run test:e2e:smoke` from `frontend`.

Expected: all checks pass in desktop and mobile Chromium.

- [ ] **Step 5: Commit and push**

Commit the component, test, specification, and plan, then push `main` to `origin`.
