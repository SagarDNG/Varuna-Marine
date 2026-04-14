# Log of AI Agent Workflow

## List of AI Agents Used

| Agent            | Purpose                                            |
| -----------------| ---------------------------------------------------|
| **Claude** (**claude.ai**)    | Generation of boilerplates, test scaffolding, drafts of documentation |
| **ChatGPT** (**OpenAI**)      | Debugging Docker Compose start up problems, resolving environment variables |

---

## Description of How AI Was Used for the Given Project

Prior to using an AI tool the following manual actions were taken:

1. **Read the regulation of FuelEU** - namely, its Annex IV (CB formula) and Articles 20-21 (rules on banking and pools).
   It was necessary to understand the domain logic prior to doing anything.
2. **Designed the hexagonal architecture** - decided about its `core -> ports -> adapters` separation, where to put what, how the dependencies will flow.
3. **Designed the DB schema** - designed five tables (`routes`, `ship_compliance`, `bank_entries`, `pools`, `pool_members`) with relations before writing a single line of code.
4. **Designed domain entities and port interfaces manually** - manually wrote interfaces like `IRouteRepository`, `IBankRepository`, etc.
   These interfaces are contracts which everything else relies on; they had to be thought out properly.

Using AI followed after all of this was done.
---

## Prompts & Outputs

### 1 — PostgreSQL repository adapters

**Background:** Interfaces (`IRouteRepository`, `IComplianceRepository`, and so forth) had been developed and finalized beforehand. The goal was to implement them against `pg`.

**Prompt:**
> "Here is the `IRouteRepository` interface. Develop its implementation using the `pg` library based on this schema: [schema pasted]. Be consistent with `snake_case` in SQL queries and `camelCase` in TypeScript. Explicitly map table rows; no ORM please."

**What was taken from the output:**
- Row-mapping logic inside `mapRow` function looked fine and was copied verbatim.
- The parameterized queries syntax was good too.

**What was improved:**
- In the `setBaseline` method, there used to be only a straightforward `UPDATE ... WHERE id = $1 SET is_baseline = TRUE`, which would not work if multiple baselines should be prevented from existing. Modified the solution to do this within a transaction: clear all baselines first and then set the desired route baseline.
- The `pg` library includes a `Pool` class that conflicts with the domain `Pool` entity. Changed the import to `import { Pool as PgPool } from 'pg'`.
- 
---

### 2 — Pool allocation algorithm

**Context:** The greedy allocation algorithm for Article 21 was implemented first, i.e., sorting members by descending CB, iterating, and transferring the excess to the deficit. The algorithm was straightforward; the question was to write it in TypeScript.

**Prompt:**
> "Write a pure function in TypeScript without any side effects that sorts an array of members in descending order by `cbBefore`, and transfers the excess to the deficit members until both are solved. Input: `Array<{ shipId, cbBefore }>`. Output: the same array but with `cbAfter`."

**What was taken:**
- The nested loops were correctly written and used.

**What was changed:**
- The original output implementation contained the Article 21 validation logic (i.e., deficit ship cannot leave worse, surplus ship cannot leave negative). Business validation is not part of the algorithm. These rules are better left in the `CreatePoolUseCase` rather than in the pure function.

---

### 3 — Test scaffolding

**Context:** The approach to testing was decided from the start, without a real database (mocking the repositories in memory).

**Prompt:**
> "Write integration tests for these four Express routers using supertest. Do not use a real database; implement in-memory versions of the repository interfaces, using Maps and arrays for the data, and plug those into the test Express app."

**What was taken:**
- The in-memory implementation of the repositories was clean and reused as-is.
- The supertest format was correct.

**What was changed:**
- Paths in the test import statements were wrong (the test file was under `adapters/inbound/http/__tests__`, while the import statements suggested that it was at the top level of the project directory tree).
- One test had an incorrect assertion (`formatPercent(0)` should return `'+0.00%'` because `0 > 0` is false).
  
---

### 4 — Startup sequence for Docker Compose services (ChatGPT)

**Context:** After building the local Docker images, `docker compose up` kept failing — backend crashing on start-up due to `ECONNREFUSED` caused by the migrations running too early while PostgreSQL was not yet fully booted, despite using `depends_on` + `condition: service_healthy`.

**First attempt at fixing:** Went over the Docker Compose docs regarding the `healthcheck` directive and the `depends_on` directive. Configuration seemed to be done correctly but did not fix the issue.

**Prompt to ChatGPT:**
> "NodeJS backend crashes on boot-up with ECONNREFUSED, despite having a depends_on service healthy check with postgresql service. The backend runs migrate-seed-startup. Is there anything else I should try?"

**Solution from ChatGPT:** The `healthcheck` directive in Docker is designed to pass before the PostgreSQL process has actually accepted any TCP connection. It is known to cause a race condition with the `pg_isready` check. Adding a retry loop to the application was advised instead of using the Docker `healthcheck`.

**Change made:** Added an automatic retry function in `migrate.ts` to attempt `SELECT 1` query up to 5 times with a 2 seconds delay between each attempt before running further migrations:

```typescript
async function waitForDB(retries = 5, delay = 2000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch {
      if (i === retries - 1) throw new Error('Could not connect to database');
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

This solved my problem. The docker-healthcheck remains as the primary gate, whereas the retry logic serves as the second line of defense.

---

## Validation Approach

Each generated code snippet was manually inspected prior to committing. Highlights include:

| Aspect        | Method of validation                                    |
| ------------- | ----------------------------------------------------- |
| CB sign calculation formula    | Manually computed R002: `(89.3368 − 88.0) × (4800 × 41,000) = 263,059,200 gCO₂e`. Verified positive value indicates surplus; negative value represents deficit, as specified in Annex IV |
| Pooling allocation method       | Manually traced through the logic using a 3-participant scenario prior to executing tests          |
| FIFO bank consumption          | Version generated consumed allocations proportionally. Implemented FIFO logic explicitly — allocating older entries first, a typical accounting procedure   |
| Import path integrity          | All imported generated files were verified against their real path locations                    |
| Asserted values               | Assertions were verified for correctness against the actual contract of the functions            |

---

## Where AI Assisted and Where it Could Not

**Assisted:**
- Building the four PostgreSQL adapters based on existing interfaces — repetitive tasks with clear patterns that can be easily generated.
- Translating an explicitly stated algorithm into typescript code — quick when there is a known logic.
- Writing tests boilerplate — mock factory functions, using supertest, building describe & it blocks.

**Not assisted/required corrections:**
- Anything dealing directly with the content of the regulation — e.g., the sign convention in CB formula, exit regulations in Article 21, FIFO or pro-rata banking. Reading was needed for such tasks.
- Specific docker network configuration and issues — Claude's suggestions did not cover the issue related to a race condition when starting a healthcheck, while ChatGPT provided a correct solution for that particular case.
- High-level architectural decisions — which parts to place where, how to design port interfaces, dependencies direction etc. This was agreed before writing prompts.
---

## Best Practices Used

- Architecture and schema were planned before opening any AI tool
- Prompts were prepared for defined interfaces rather than asking AI to build everything from scratch
- Generated outputs were tested before committing them
- Separate tools were selected based on what each excelled at – code generation for Claude and debugging for ChatGPT
- Issues discovered during testing were resolved by addressing the root problem rather than passing the test
