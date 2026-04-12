# FuelEU Maritime Compliance Platform

A full-stack implementation of the **FuelEU Maritime** compliance module, built to EU Regulation 2023/1805. Covers route management, GHG intensity comparison, compliance balance (CB) banking (Article 20), and vessel pooling (Article 21).

---

## Architecture

This project follows **Hexagonal Architecture (Ports & Adapters)** in both the backend and frontend. The core domain has zero framework dependencies — Express, PostgreSQL, and React are all in the adapter layer.

```
┌─────────────────────────────────────────────────────────────┐
│                        CORE (framework-free)                │
│                                                             │
│   domain/          → entities, formulas, domain errors      │
│   ports/           → IRouteRepository, IBankRepository…     │
│   application/     → use cases (orchestrate domain + ports) │
└────────────────┬────────────────────────────────────────────┘
                 │ implements ports
┌────────────────▼────────────────────────────────────────────┐
│                        ADAPTERS                             │
│                                                             │
│   inbound/http/    → Express route handlers                 │
│   outbound/postgres/ → pg repository implementations        │
│   ui/              → React components + hooks               │
│   infrastructure/  → API client (frontend)                  │
└─────────────────────────────────────────────────────────────┘
```

### Backend folder structure

```
backend/src/
  core/
    domain/
      entities.ts          # Route, Pool, BankEntry, domain errors
      formulas.ts          # computeComplianceBalance, allocatePool…
    ports/
      repositories.ts      # IRouteRepository, IBankRepository…
    application/use-cases/
      routes.use-case.ts
      compliance.use-case.ts
      banking.use-case.ts
      pooling.use-case.ts
  adapters/
    inbound/http/routes/   # Express handlers (routes, compliance, banking, pools)
    outbound/postgres/     # PgRouteRepository, PgBankRepository…
  infrastructure/
    db/                    # pool.ts, migrate.ts, seed.ts
    server/                # app.ts (DI wiring), index.ts
```

### Frontend folder structure

```
frontend/src/
  core/
    domain/types.ts        # Mirrored domain types (no React deps)
    ports/api.ports.ts     # IRoutePort, IBankingPort…
  adapters/
    infrastructure/
      api.client.ts        # HTTP implementations of all ports
    ui/components/
      Routes/RoutesTab.tsx
      Compare/CompareTab.tsx
      Banking/BankingTab.tsx
      Pooling/PoolingTab.tsx
      shared/primitives.tsx
  shared/
    hooks/useAsync.ts      # Generic data fetching + mutation hooks
    utils/format.ts        # formatCB, formatGHG, isCompliant…
```

---

## Domain Formulas

Per **FuelEU Maritime Regulation (EU) 2023/1805, Annex IV**:

| Formula | Expression |
|---------|-----------|
| Energy in scope | `fuelConsumption (t) × 41,000 MJ/t` |
| Compliance Balance | `(Target − Actual GHG) × EnergyInScope` |
| Target intensity (2025) | `89.3368 gCO₂e/MJ` (2% below 91.16) |
| Percent diff | `((comparison / baseline) − 1) × 100` |
| Pool allocation | Greedy: sort desc by CB, transfer surplus → deficits |

Positive CB = surplus. Negative CB = deficit.

---

## Setup & Run

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ (for local development without Docker)

### Option A — Docker Compose (recommended)

```bash
# Clone and enter
git clone https://github.com/SagarDNG/Varuna-Marine.git
cd Varuna-Marine

# Start all services (Postgres + backend + frontend)
docker compose up --build

# Frontend → http://localhost:5173
# Backend  → http://localhost:3001
# Health   → http://localhost:3001/health
```

### Option B — Local development

**Backend:**

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL to your local Postgres instance

npm install
npm run migrate    # creates tables
npm run seed       # inserts 5 seed routes
npm run dev        # ts-node-dev on port 3001
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev        # Vite dev server on port 5173 (proxies API to :3001)
```

---

## API Reference

### Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/routes` | All routes. Query: `?vesselType=&fuelType=&year=` |
| `POST` | `/routes/:id/baseline` | Set route as baseline |
| `GET` | `/routes/comparison` | Baseline vs all others with `percentDiff` + `compliant` |

### Compliance

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/compliance/cb?shipId=&year=` | Compute + store CB snapshot |
| `GET` | `/compliance/adjusted-cb?shipId=&year=` | CB after bank applications |

### Banking (Article 20)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/banking/records?shipId=&year=` | Bank entry history |
| `POST` | `/banking/bank` | Bank positive CB. Body: `{ shipId, year, amount }` |
| `POST` | `/banking/apply` | Apply banked to deficit. Body: `{ shipId, year, amount }` |

### Pooling (Article 21)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/pools?year=` | All pools (optional year filter) |
| `POST` | `/pools` | Create pool. Body: `{ year, members: [{ shipId, cbOverride? }] }` |

### Sample requests

```bash
# Get all routes
curl http://localhost:3001/routes

# Set baseline
curl -X POST http://localhost:3001/routes/<uuid>/baseline

# Get comparison
curl http://localhost:3001/routes/comparison

# Compute CB for R002, 2024
curl "http://localhost:3001/compliance/cb?shipId=R002&year=2024"

# Bank surplus
curl -X POST http://localhost:3001/banking/bank \
  -H "Content-Type: application/json" \
  -d '{"shipId":"R002","year":2024,"amount":100000}'

# Apply banked
curl -X POST http://localhost:3001/banking/apply \
  -H "Content-Type: application/json" \
  -d '{"shipId":"R002","year":2024,"amount":50000}'

# Create pool
curl -X POST http://localhost:3001/pools \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2024,
    "members": [
      { "shipId": "R001", "cbOverride": -1000000 },
      { "shipId": "R002", "cbOverride": 2000000 }
    ]
  }'
```

### Sample responses

**GET /routes/comparison**
```json
{
  "data": {
    "baseline": {
      "routeId": "R001",
      "ghgIntensity": 91.0,
      "isBaseline": true
    },
    "comparisons": [
      {
        "comparisonRoute": { "routeId": "R002", "ghgIntensity": 88.0 },
        "percentDiff": -3.2967,
        "compliant": true
      },
      {
        "comparisonRoute": { "routeId": "R003", "ghgIntensity": 93.5 },
        "percentDiff": 2.7473,
        "compliant": false
      }
    ]
  }
}
```

**GET /compliance/cb?shipId=R002&year=2024**
```json
{
  "data": {
    "shipId": "R002",
    "year": 2024,
    "cbGco2eq": 263059200,
    "computedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## Running Tests

### Backend

```bash
cd backend
npm install
npm test                  # all tests (unit + integration)
npm run test:unit         # domain formulas + use case mocks only
npm run test:integration  # HTTP endpoint tests (no DB required)
```

Tests run entirely in-memory — no PostgreSQL required. The integration tests use in-memory repository implementations that satisfy the port interfaces.

### Frontend

```bash
cd frontend
npm install
npm test                  # vitest unit tests
```

---

## Seed Data

Five routes are seeded on startup. R001 is the default baseline.

| Route | Vessel | Fuel | Year | GHG (gCO₂e/MJ) | CB |
|-------|--------|------|------|----------------|-----|
| R001 | Container | HFO | 2024 | 91.0 | Deficit |
| R002 | BulkCarrier | LNG | 2024 | 88.0 | **Surplus** |
| R003 | Tanker | MGO | 2024 | 93.5 | Deficit |
| R004 | RoRo | HFO | 2025 | 89.2 | **Surplus** |
| R005 | Container | LNG | 2025 | 90.5 | Deficit |

---

## Evaluation Checklist

| Area | Implementation |
|------|---------------|
| Hexagonal architecture | `core/` has zero framework imports; adapters implement ports |
| CB formula | `(Target − Actual) × (fuelConsumption × 41,000)` per Annex IV |
| Banking (Article 20) | Bank surplus, apply FIFO, balance validation |
| Pooling (Article 21) | Greedy allocation, sum ≥ 0, deficit/surplus exit rules |
| TypeScript strict mode | Enabled in both `tsconfig.json` files |
| Tests | Unit (formulas + use cases) + integration (HTTP endpoints) |
| AI agent docs | `AGENT_WORKFLOW.md` with real prompts, outputs, corrections |
| Docker Compose | Postgres + backend + frontend, health-checked startup order |

---

## Reference

**FuelEU Maritime Regulation (EU) 2023/1805** — Annex IV (CB formula), Articles 20–21 (banking and pooling rules).
