# Reflection — AI-Assisted Development

## What I Learned Using AI Agents

The most significant shift was treating the AI agent as a **collaborator on architecture**, not just a code typist. Early in this project I prompted Claude with implementation-level requests ("write a PostgreSQL repository for routes") and got workable but shallow code. When I switched to architectural prompts ("design a hexagonal adapter for routes that satisfies this port interface, explain the trade-offs"), the output was substantially more deliberate — the separation of concerns was cleaner and the generated code required fewer corrections.

I also learned that **the quality of domain modeling prompts determines the quality of everything downstream.** Because I asked Claude to produce pure domain entities and formulas first — before any framework was mentioned — the core layer came out genuinely framework-agnostic. When adapters were generated later, they had clean, unambiguous interfaces to implement against.

## Efficiency Gains vs. Manual Coding

| Task | Estimated manual time | With Claude |
|------|----------------------|-------------|
| Domain entities + formulas | 45 min | 5 min |
| 4 PostgreSQL repository adapters | 2.5 hr | 15 min |
| 4 HTTP handlers + DI wiring | 2 hr | 10 min |
| Mock repositories for tests | 1.5 hr | 15 min |
| Full test suite (unit + integration) | 3 hr | 30 min |
| Frontend API client + hooks | 1.5 hr | 20 min |
| All 4 tab components (UI) | 4 hr | 40 min |
| **Total** | **~15 hr** | **~2.5 hr** |

The 6× speedup came primarily from eliminating structural boilerplate — the parts of software where the pattern is clear but the typing is tedious. The time I *did* spend was on validation: checking formula signs, verifying Article 20/21 logic against the regulation text, and reviewing generated tests for false-positive passes.

## What I'd Do Differently Next Time

**1. Prompt for tests before implementation.**  
Asking "write tests for `computeComplianceBalance` that cover surplus, deficit, and edge cases" before asking for the implementation would have locked in the expected contract earlier. The formula sign bug (computing `actual − target` instead of `target − actual`) would have been caught as a failing test before any code was accepted.

**2. Use a structured prompt template.**  
By the end of the project I had converged on a pattern that worked well:
```
Context: [what layer / what interface it implements]
Task: [specific function or class]
Constraints: [TypeScript strict, no framework imports in core, FIFO not pro-rata, etc.]
Verify: [what I'll check manually]
```
Starting with this template from the beginning would have avoided several early corrections.

**3. Keep domain and adapter generation in separate sessions.**  
Mixing domain and infrastructure prompts in the same context caused Claude to occasionally "leak" framework references into core types. A clean context boundary mirrors the architectural boundary.

**4. Generate the migration and seed before the repositories.**  
I generated the repositories before the database schema was finalized. The column naming mismatch (`cb_gco2eq` vs `cb_gCO2eq`) required a pass of find-and-replace. Schema-first would have eliminated this entirely.

## Final Observation

The most honest framing I found: AI-assisted development is a force multiplier on **clarity of thought**, not a substitute for it. The better I could articulate what I wanted — precisely, with constraints stated — the better the output. The times it failed were the times I was fuzzy about what I actually needed.
