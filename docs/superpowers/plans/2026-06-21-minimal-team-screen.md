# Minimal Team Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the team screen to match the approved compact mobile mockup while preserving appointments, barber creation, invitations, commissions, and access states.

**Architecture:** `TeamPage` continues to own date and data loading, but it also owns the management-sheet visibility so the header gear can open it. `AdminDashboard` becomes the operational team surface: one summary row, one grouped barber list, the existing individual agenda, and a secondary compact management sheet. Existing store APIs and backend contracts remain unchanged.

**Tech Stack:** React 18, React Router, Tailwind CSS, Lucide React, Vitest, Testing Library, Playwright.

## Global Constraints

- Match `C:\Users\Rafael lauri\.codex\generated_images\019e8ab7-deef-7e21-a026-15c311161326\exec-57207ac2-2707-48c9-a194-eb023aee6277.png` as the visual source of truth.
- Keep the existing dark/light design tokens and 8px-or-less card radii.
- Do not change backend contracts, routes, authorization rules, or store API signatures.
- Preserve barber creation, commission, invite, invite-link copy, appointment creation, and appointment editing.
- Keep all text in Brazilian Portuguese and prevent text/action overlap at mobile widths.

---

### Task 1: Header and management ownership

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/src/pages/TeamPage.jsx`
- Test: `frontend/src/components/AdminDashboard.test.jsx`

**Interfaces:**
- Produces: `teamSheetOpen: boolean` and `setTeamSheetOpen(next: boolean)` in `TeamPage`.
- Produces: `AdminDashboard` props `teamSheetOpen` and `onTeamSheetOpenChange`.
- Consumes: existing `currentDate`, `prevDay`, `nextDay`, and `formatDateDisplay`.

- [ ] **Step 1: Add a failing integration test for externally opening team management**

Render `AdminDashboard` with `teamSheetOpen={true}` and assert that `Gerenciar equipe` is visible. Render it with `teamSheetOpen={false}` and assert that it is absent.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- AdminDashboard.test.jsx`

Expected: FAIL because `AdminDashboard` still owns its sheet visibility and ignores the new props.

- [ ] **Step 3: Install Lucide React**

Run: `npm install lucide-react`

Expected: `package.json` and `package-lock.json` contain `lucide-react`.

- [ ] **Step 4: Implement the approved header and controlled sheet state**

In `TeamPage.jsx`:

```jsx
const [teamSheetOpen, setTeamSheetOpen] = useState(false);

<header className="shrink-0 border-b border-border bg-background px-4 py-4">
  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
    <h1 className="font-logo text-xl text-foreground">Equipe</h1>
    <div className="flex items-center gap-2">
      <IconButton label="Dia anterior" onClick={prevDay}><ChevronLeft /></IconButton>
      <span>{formatDateDisplay(currentDate)}</span>
      <IconButton label="Proximo dia" onClick={nextDay}><ChevronRight /></IconButton>
    </div>
    <IconButton label="Gerenciar equipe" onClick={() => setTeamSheetOpen(true)} className="justify-self-end">
      <Settings />
    </IconButton>
  </div>
</header>
```

Pass controlled state to `AdminDashboard`:

```jsx
<AdminDashboard
  teamSheetOpen={teamSheetOpen}
  onTeamSheetOpenChange={setTeamSheetOpen}
  {...existingProps}
/>
```

Remove the old `ScreenHeader`, redundant eyebrow/title, and navigation to global settings from this screen.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `npm test -- AdminDashboard.test.jsx`

Expected: all dashboard tests pass.

### Task 2: Compact team overview

**Files:**
- Modify: `frontend/src/components/AdminDashboard.jsx`
- Modify: `frontend/src/components/AdminDashboard.test.jsx`

**Interfaces:**
- Consumes: `barbers`, `appointments`, `dayKey`, `onReload`, and controlled sheet props.
- Produces: `getInitials(name)`, compact barber rows, and existing `activeBarberId` detail navigation.

- [ ] **Step 1: Add failing tests for the compact hierarchy**

Add a test with three barbers and appointments that asserts:

```jsx
expect(screen.getByText("3 barbeiros · 3 atendimentos hoje")).toBeTruthy();
expect(screen.getByText("SA")).toBeTruthy();
expect(screen.getByText("Acesso liberado")).toBeTruthy();
expect(screen.getByText("Agenda livre")).toBeTruthy();
expect(screen.queryByText("Livres")).toBeNull();
expect(screen.queryByText("Recebido")).toBeNull();
expect(screen.queryByText("Ver agenda do barbeiro")).toBeNull();
```

Click `Abrir agenda de Samuel` and assert that the individual agenda heading appears. Click `Adicionar cliente para Samuel` and assert that the appointment dialog mock receives the open state.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- AdminDashboard.test.jsx`

Expected: FAIL because the current dashboard still renders metrics, chips, cards, and previews.

- [ ] **Step 3: Replace dashboard metrics and cards with one grouped list**

Remove `BarberMetric`, `AppointmentPreview`, `BarberCard`, `getFreeSlots`, `getPaidTotal`, `getPendingTotal`, top metric grids, and barber filter chips.

Add helpers:

```jsx
function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
}

function accessLabel(barber) {
  if (barber.usuario_id) return "Acesso liberado";
  if (barber.convite_pendente) return "Acesso pendente";
  return "Sem acesso";
}
```

Render one summary line and one bordered list:

```jsx
<p>{barbers.length} barbeiros · {appointments.length} atendimentos hoje</p>
<div className="divide-y divide-border rounded-lg border border-border bg-card/30">
  {barbers.map((barber) => {
    const rows = grouped.get(barber.id) || [];
    const next = getNextAppointment(rows, dayKey);
    return <TeamBarberRow key={barber.id} barber={barber} rows={rows} next={next} />;
  })}
</div>
```

Each row must contain initials, name, access state, next time/client/service or `Agenda livre`, daily count, Lucide `Plus`, and Lucide `ChevronRight`. Use fixed/minmax grid tracks so labels cannot overlap actions at 360px width.

- [ ] **Step 4: Preserve detailed agenda navigation**

Keep `BarberAgenda`, but open it only from the barber row chevron/content action. Keep the plus action wired to `openNewForBarber`. Keep back, empty-slot add, and appointment edit behavior unchanged.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `npm test -- AdminDashboard.test.jsx`

Expected: all compact-list and invite tests pass.

### Task 3: Minimal management sheet

**Files:**
- Modify: `frontend/src/components/AdminDashboard.jsx`
- Modify: `frontend/src/components/AdminDashboard.test.jsx`
- Modify: `frontend/e2e/critical-flows.spec.js`

**Interfaces:**
- Consumes: existing `addBarber`, `sendBarberInvite`, and `onReload`.
- Produces: compact access rows and `createFormOpen: boolean` local state.

- [ ] **Step 1: Add a failing test for collapsed creation**

Open the controlled management sheet and assert that `Adicionar barbeiro` is visible while the `Nome` input is absent. Click `Adicionar barbeiro`, then assert that name, email, commission, and invite controls appear.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- AdminDashboard.test.jsx`

Expected: FAIL because the current form is always expanded.

- [ ] **Step 3: Implement the compact sheet**

Add `createFormOpen` defaulting to `false`. Replace the always-visible form with a full-width `Adicionar barbeiro` command; expand the existing form only after activation. Convert barber management cards to one divided list with name/email, commission, one access state, and invite action. Keep success/error notices and invite-link copy directly below the action feedback.

Use `onTeamSheetOpenChange(false)` for overlay, close button, and successful dismissal. Reset `createFormOpen` only after successful barber creation.

- [ ] **Step 4: Update the browser smoke selector**

In `critical-flows.spec.js`, open the screen through the header button labeled `Gerenciar equipe`; keep the repeated-invite assertion unchanged. If the new collapsed form changes duplicate labels, target the header action explicitly.

- [ ] **Step 5: Run focused unit and E2E tests**

Run:

```powershell
npm test -- AdminDashboard.test.jsx
npm run test:e2e:smoke
```

Expected: unit tests pass and all six desktop/mobile smoke scenarios pass.

### Task 4: Visual and full regression verification

**Files:**
- Modify only if verification finds a mismatch: `frontend/src/pages/TeamPage.jsx`, `frontend/src/components/AdminDashboard.jsx`

**Interfaces:**
- Consumes: approved mockup and local dev server.
- Produces: verified mobile and desktop rendering.

- [ ] **Step 1: Run the complete validation gate**

Run: `powershell -ExecutionPolicy Bypass -File scripts/check-all.ps1`

Expected: backend tests, frontend lint, frontend tests, and production build all pass.

- [ ] **Step 2: Start or confirm the local app**

Run: `powershell -ExecutionPolicy Bypass -File scripts/status-dev.ps1`

If stopped, start the existing development scripts and verify backend `/health/db` plus frontend HTTP 200.

- [ ] **Step 3: Compare the implementation to the approved image**

Open `/team` at mobile `390x844` and desktop width. Verify header alignment, one summary row, grouped list, row spacing, access colors, action targets, bottom navigation, and absence of old metrics/chips/cards. Correct visible mismatches without changing the approved hierarchy.

- [ ] **Step 4: Re-run affected tests after visual corrections**

Run:

```powershell
cd frontend
npm test -- AdminDashboard.test.jsx
npm run test:e2e:smoke
```

Expected: all tests pass.

- [ ] **Step 5: Commit the implementation**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/src/pages/TeamPage.jsx frontend/src/components/AdminDashboard.jsx frontend/src/components/AdminDashboard.test.jsx frontend/e2e/critical-flows.spec.js
git commit -m "Redesenha tela de equipe"
```
