# 🎮 NextGame

A high-performance, distributed, local-first game discovery and backlog management system. NextGame bridges the gap between a high-fidelity web experience and the reliability of a native desktop application.

## Overview

NextGame uses an **Offline-First** architecture, utilizing IndexedDB for local persistence and a type-safe sync engine (tRPC) to reconcile data with a PostgreSQL source of record. It features an intelligent AI orchestration layer that analyzes user playstyles to provide nuanced, mood-based recommendations — all while maintaining strict data integrity through the Outbox Pattern and conflict resolution logic.

## Architecture

```
nextgame/
├── apps/
│   ├── web/          # React + Vite + Tailwind CSS frontend
│   └── api/          # Fastify + tRPC backend
├── packages/
│   └── shared/       # Shared types, Zod schemas, constants
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

### Tech Stack

| Layer              | Technology           | Purpose                                                        |
| ------------------ | -------------------- | -------------------------------------------------------------- |
| Monorepo           | Turborepo + pnpm     | Task orchestration, shared types across workspace              |
| Frontend Build     | Vite                 | Sub-second HMR, optimized production bundles                   |
| Frontend UI        | React + Tailwind CSS | Reactive, utility-first UI                                     |
| Local Database     | Dexie.js (IndexedDB) | Browser-side source of truth; offline game library + sync queue|
| Sync Engine        | tRPC + Fastify       | End-to-end type safety between client and server               |
| Remote Database    | PostgreSQL           | ACID-compliant source of record                                |
| State Management   | TanStack Query       | Caching, background revalidation, optimistic UI                |
| ORM                | Prisma               | Type-safe DB access, schema shared via tRPC                    |
| Data Validation    | Zod                  | Strict contracts for API inputs, DB records, local schemas     |
| Containerization   | Docker               | Environment parity between dev and production                  |
| CI/CD              | GitHub Actions       | Automated linting, type-checking, and builds                   |
| AI / LLM           | OpenAI + Anthropic   | Mood-based game recommendations with provider fallback         |

## Planned Features

### Authentication
- **Multi-User Auth**: Email/password authentication with bcrypt hashing and Redis-backed session cookies.

### Foundation & Offline-First
- **Game Discovery Engine**: IGDB API integration via Fastify proxy with Redis-backed caching for rate-limit protection.
- **Local-First Storage**: Full game library in Dexie.js — browse, filter, and sort with zero connectivity.
- **Zod Validation**: Strict typing for all external API data.

### State Resilience & Outbox Pattern
- **Kanban Backlog Board**: Drag-and-drop interface (Backlog → Playing → Beaten) with optimistic UI via TanStack Query.
- **Sync Outbox**: Event-driven outbox that syncs writes immediately when online; failed operations queue locally and flush on reconnect via tRPC mutations.
- **"Chaos" Toggle**: UI component to simulate offline mode for testing resilience.

### Intelligence Layer (AI Orchestration)
- **"Vibe" Recommender**: AI-powered drawer where users input mood and time constraints. Uses OpenAI (with Anthropic as fallback) to consider a user's backlog and games that they may not be acquainted with yet to create a "What to Play Now" list.
- **Reasoning Cards**: Each recommendation shows *why* the AI chose it.
- **Strict JSON Schema**: LLM output is validated to prevent UI breakage from hallucinated data.

### Conflict Resolution & Production Readiness
- **Last-Write-Wins (LWW)**: Conflict resolution using `updated_at` timestamps for multi-device sync.
- **Virtualized Lists**: `@tanstack/react-virtual` for large game libraries.
- **Dockerized Deployment**: Containerized services deployed via GitHub Actions CI/CD.

## Getting Started

### Prerequisites

- **Node.js** >= 22.4.1
- **pnpm** >= 9
- **Docker** (for PostgreSQL and Redis)

### Setup

```bash
# Clone the repo
git clone https://github.com/mattWStevens/NextGame.git
cd nextgame

# Install dependencies
pnpm install

# Start infrastructure (Postgres + Redis)
docker compose up -d

# Copy environment variables
cp .env.example .env
# Fill in your API keys in .env

# Run the full stack in dev mode
pnpm dev
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:3001`.

### Useful Commands

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm dev`         | Start all apps in development mode   |
| `pnpm build`       | Build all apps                       |
| `pnpm typecheck`   | Run TypeScript type checking         |
| `pnpm lint`        | Lint all packages                    |
| `docker compose up -d` | Start PostgreSQL and Redis       |

## Design Decisions

> **Why IndexedDB over LocalStorage?** IndexedDB handles structured data and large datasets (50MB+) without blocking the main thread.

> **Why the Outbox Pattern?** Guarantees eventual consistency between the client and server, even in high-latency environments.

> **Why tRPC?** End-to-end type safety eliminates an entire class of serialization bugs between the frontend and backend.

> **Why treat the LLM as a stateless microservice?** Validating the JSON output prevents the UI from breaking on hallucinated data.

## Future Considerations

- **Vector Clocks** for multi-user collaborative conflict resolution (documented as an upgrade path from LWW).
- **WebSockets over Polling** for real-time sync — lower latency and reduced server load.
- Trade-offs of local-first storage (storage limits, migration complexity, IndexedDB browser inconsistencies).
