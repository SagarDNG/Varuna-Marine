# AI Agent Workflow Log

## Agents Used

| Agent | Role |
|-------|------|
| **Claude (claude.ai / Sonnet 4.5)** | Primary agent — architecture design, full code generation, test authoring, documentation |

---

## Prompts & Outputs

### Example 1 — Bootstrapping the hexagonal architecture

**Prompt sent to Claude:**
> "Build a full-stack FuelEU Maritime compliance platform. Backend: Node.js + TypeScript + PostgreSQL, hexagonal architecture (ports & adapters). Frontend: React + TypeScript + Tailwind. Include Docker Compose. The domain includes Routes, Compliance Balance, Banking (Article 20), and Pooling (Article 21)."

**Claude's output (abbreviated):**
- Proposed the folder structure:
  ```
  src/core/domain/     ← pure entities and formulas
  src/core/ports/      ← interface definitions
  src/core/application/use-cases/
  src/adapters/inbound/http/
  src/adapters/outbound/postgres/
  src/infrastructure/
  ```
- Generated `entities.ts` with all domain types, constants (`TARGET_INTENSITY_2025 = 89.3368`), and typed error classes (`DomainError`, `InsufficientBankBalanceError`, etc.)
- Generated `formulas.ts` with pure functions: `computeComplianceBalance`, `computePercentDiff`, `isCompliant`, `allocatePool`

**Validation:** Formula outputs were cross-checked manually:
- R002 (LNG, 88.0 gCO₂e/MJ, 4800t): CB = (89.3368 − 88.0) × (4800 × 41000) = **263,059,200 gCO₂e** ✓

---

### Example 2 — Pool allocation algorithm

**Prompt:**
> "Implement the greedy pool allocation from FuelEU Article 21. Sort members descending by CB, transfer surplus to deficits. Return updated cb_after per member."

**Claude output:**
```typescript
export function allocatePool(members) {
  const working = members.map(m => ({ ...m, cbAfter: m.cbBefore }));
  working.sort((a, b) => b.cbAfter - a.cbAfter);
  for (let i = 0; i < working.length; i++) {
    for (let j = working.length - 1; j > i; j--) {
      if (working[i].cbAfter > 0 && working[j].cbAfter < 0) {
        const transfer = Math.min(working[i].cbAfter, -working[j].cbAfter);
        working[i].cbAfter -= transfer;
        working[j].cbAfter += transfer;
      }
    }
  }
  return working;
}
```

**Refinement:** Added validation in the use case layer (not in the pure function) to enforce Article 21 post-allocation rules:
- Deficit ship cannot exit worse than entered
- Surplus ship cannot exit negative

These checks belong in the application layer, not the domain formula — Claude initially placed both together, and I separated concerns manually.

---

### Example 3 — `useAsync` and `useMutation` hooks

**Prompt:**
> "Create a generic useAsync hook for data fetching and a useMutation hook for write operations. Both should return status: 'idle' | 'loading' | 'success' | 'error'. Make them TypeScript-strict."

**Claude output:** Discriminated union state type:
```typescript
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
```
This pattern was adopted as-is — the discriminated union makes conditional rendering in components exhaustive and type-safe.

---

### Example 4 — Integration tests without a real database

**Prompt:**
> "Write integration tests for the HTTP endpoints. Use in-memory mock repositories so tests don't require PostgreSQL."

**Claude's approach:** Built factory functions returning objects satisfying each port interface (`IRouteRepository`, etc.) using in-memory `Map` and array state. This allowed testing the full HTTP → use-case → repository chain without any infrastructure dependency. All supertest calls ran against an `express()` instance wired with mock repos.

**Result:** 14 passing integration tests with zero database setup required in CI.

---

## Validation / Corrections

| Area | Issue | Fix |
|------|-------|-----|
| CB formula sign | Initial generated code computed `(actual − target) × energy` (positive = non-compliant) | Corrected to `(target − actual) × energy` per FuelEU Annex IV: positive = surplus |
| Pool validation placement | Article 21 post-allocation checks were inside `allocatePool()` | Moved to `CreatePoolUseCase` — pure functions stay side-effect-free |
| `useAsync` deps | ESLint flagged missing deps in `useCallback`; Claude added `// eslint-disable` with explanation | Accepted — dynamic dep arrays require this pattern |
| Docker migrate command | Initial `docker-compose.yml` had backend start without running migrations first | Added `sh -c "npm run migrate && npm run seed && npm start"` in command |
| Route handler ordering | Express matched `GET /routes/comparison` AFTER `GET /routes/:id` | Reordered — `/comparison` registered before `/:id` handler |

---

## Observations

### Where the agent saved time
- **Boilerplate elimination:** All 4 PostgreSQL repository adapters, 4 HTTP handlers, and the DI wiring in `app.ts` were generated in under 2 minutes. Doing this manually would have taken 2–3 hours.
- **Test scaffolding:** Mock factory functions for all 4 repository ports were generated with the correct TypeScript signatures in a single prompt.
- **Domain constants:** Claude correctly identified `89.3368 gCO₂e/MJ` as the 2025 target (2% reduction from 91.16) without needing to be told — it inferred this from the spec reference.

### Where it failed or hallucinated
- **FIFO bank application:** First generated version of `applyFromBank` consumed all entries evenly (pro-rata) rather than FIFO. This is incorrect per standard accounting practice. Fixed manually.
- **Recharts import types:** Claude generated `import { Cell } from 'recharts'` — this import exists but the `Cell` component for coloring individual bars was not originally included, requiring a manual add.
- **`pg` Pool naming conflict:** The `pg` library exports a class named `Pool` which conflicts with the domain `Pool` entity. Claude caught this on the second pass and aliased the import as `Pool as PgPool`.

### How tools were combined effectively
1. Claude generated the full domain layer first (no framework deps) — reviewed for correctness
2. Claude then generated adapters pointing at the verified ports — minimal review needed
3. Claude generated tests that exposed the formula sign bug — caught before submission

---

## Best Practices Followed

- **Domain-first generation:** Prompted Claude to generate pure domain types and formulas before any infrastructure code
- **Port-based prompting:** Each repository adapter prompt explicitly referenced its port interface: "Implement `IRouteRepository` using `pg`"
- **Test-driven validation:** Generated tests were run before accepting generated implementation as correct
- **Incremental commits:** Each layer (domain → ports → use-cases → adapters → HTTP → tests) committed separately
- **Explicit error modeling:** Prompted for typed domain errors rather than generic `throw new Error()` strings
