# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Instructions

Act as a secure, compliant senior developer. Do not generate code that exactly reproduces copyrighted, proprietary, or GPL-licensed material. Prefer standard libraries. If using external libraries, use only permissive licenses like MIT, Apache 2.0, or BSD. If asked to port code, rewrite the logic rather than copy-pasting structure.

## Project Overview

NextGame is a local-first game discovery and backlog management app with offline-first architecture. It uses a Turborepo monorepo with pnpm workspaces.
See @README.md for more details.

## Monorepo Structure

- **apps/web** — React 18 + Vite 5 frontend with Tailwind CSS (port 5173)
- **apps/api** — Fastify 4 backend server (port 3001)
- **packages/shared** — Shared Zod schemas, tRPC types, and constants

## Commands

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start all apps in dev mode (Turborepo)
pnpm build                # Build all apps
pnpm typecheck            # TypeScript type checking across all packages
pnpm lint                 # Lint all packages (placeholder — not yet configured)
pnpm clean                # Remove build artifacts

# Docker services (PostgreSQL 16 + Redis 7)
docker compose up -d      # Start database and cache
docker compose down       # Stop services
```

There is no test runner configured yet. Linting is also a placeholder.

### Per-app commands

Run from root using pnpm filters:
```bash
pnpm --filter api dev     # Start only the API server
pnpm --filter web dev     # Start only the web frontend
pnpm --filter shared typecheck
```

## Architecture

**Frontend (apps/web):** Vite dev server proxies `/api` requests to `localhost:3001`. Entry point is `src/main.tsx`. Tailwind CSS for styling via PostCSS.

**Backend (apps/api):** Fastify server in `src/server.ts`. Currently has a health check at `GET /api/health`. Uses `tsx watch` for dev hot-reload. Multi-stage Dockerfile for production.

**Shared (packages/shared):** Exports from `src/index.ts`. Contains `APP_NAME` constant and placeholder types for future Zod schemas and tRPC contracts.

**Turborepo pipeline:** `build` and `typecheck` tasks depend on `^build` (build dependencies first). `dev` is persistent and uncached.

## Infrastructure

- **PostgreSQL 16** at `localhost:5432` (user: postgres, password: postgres, db: nextgame)
- **Redis 7** at `localhost:6379`
- Both run via `docker-compose.yml`

## Environment

Copy `.env.example` to `.env`. Key variables: `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, `API_PORT`.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on pushes/PRs to `main`: installs with pnpm, then runs `typecheck`, `lint`, and `build`. Uses Node 22.4.1 and pnpm version from `package.json`.

## Key Conventions

- **TypeScript strict mode** is enabled across all packages
- **ES2022** target, **ESNext** modules, **bundler** module resolution
- **pnpm 9.1.0** is the required package manager (enforced in package.json)
- **Node >= 22.12.0** required (Prisma requires 22.12+)
- Git workflow: `develop` branch for development, `main` for production/PRs

## Planned Architecture (not yet implemented)

The README describes planned features: Prisma ORM, tRPC for end-to-end type safety, Dexie.js for client-side IndexedDB (offline-first), TanStack Query for state/caching, IGDB API integration via Fastify proxy with Redis caching, and an AI recommendation layer (OpenAI/Anthropic). Sync uses an outbox pattern with last-write-wins conflict resolution.
