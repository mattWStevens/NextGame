# NextGame Implementation Plan

## Context

NextGame is a local-first game discovery and backlog management app. The codebase is a well-structured Turborepo monorepo with all tooling wired (Vite, Tailwind, Fastify, Docker, CI) but **zero application logic**. The only functional code is a health check endpoint and a "coming soon" splash page. Everything below — database, auth, API, UI, offline storage, sync, and AI — must be built from scratch.

**Key decisions:**
- Multi-user with email/password authentication
- Standard web app (no PWA)
- AI recommender supports both OpenAI and Anthropic (OpenAI preferred, Anthropic fallback)
- Session storage: Redis (via connect-redis)
- Production deployment: Fastify serves static files (@fastify/static)
- Sync strategy: Immediate sync on mutation (no polling)
- Zod v4
- tRPC v11 (requires TanStack Query v5)
- React 18 (stay on current version)

---

## Phase 1: Foundation — Linting, Testing, Domain Types

**Goal:** Developer tooling and the shared type system everything else depends on.

### Task 1.1: ESLint Setup (COMPLETE)
- Install at root: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Create `/eslint.config.mjs` (flat config): TS strict rules, React hooks rules for web, Node env for API, ignore `dist/`
- Update lint scripts in all three `package.json` files from placeholder echo to `eslint src/`
- **AC:** `pnpm lint` passes across all workspaces; CI runs real linting

### Task 1.2: Vitest Setup (COMPLETE)
- Install at root: `vitest`. In web: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`
- Create `vitest.config.ts` in each workspace (jsdom for web, node for api/shared)
- Create `apps/web/src/test/setup.ts` for testing-library matchers
- Add `test` task to `turbo.json`, add `pnpm test` to root and each workspace, add test step to CI
- **AC:** `pnpm test` runs vitest everywhere (passes with zero tests initially)

### Task 1.3: Shared Zod Schemas and Domain Types (COMPLETE)
- Upgrade `zod` to v4 (`^4.0.0`) and move it from devDependencies to dependencies in `packages/shared`
- Create schemas in `packages/shared/src/schemas/`:
  - **`user.ts`** — `UserSchema` (id, email, displayName, createdAt, updatedAt), `LoginSchema` (email, password), `RegisterSchema` (email, password `.min(8)`, displayName)
  - **`game.ts`** — `GameStatusSchema` (backlog | playing | beaten), `GameSchema` (id, userId, igdbId, title, slug, coverUrl, summary, genres, platforms, releaseDate, rating, review, status, statusOrder, createdAt, updatedAt)
  - **`igdb.ts`** — `IgdbGameSchema` (validates IGDB API responses), `IgdbSearchResultSchema`
  - **`sync.ts`** — `SyncOperationSchema` (create | update | delete), `OutboxEntrySchema`
  - **`ai.ts`** — `VibeRequestSchema` (mood, availableMinutes — session play time, preferredGameLength — optional enum: short | medium | long | any for total game completion time, preferredGenres), `RecommendationSchema` (igdbId, title, reason, estimatedSessionMinutes, matchScore, reviewUrl, trailerUrl), `VibeResponseSchema`
  - **`index.ts`** — re-exports all schemas
- Update `packages/shared/src/index.ts` to re-export schemas and constants
- Create `packages/shared/src/__tests__/schemas.test.ts` — validates correct/incorrect data
- **AC:** All types exported, `pnpm typecheck` passes, schema tests pass

### Task 1.4: Shared Package Build Fix
- The shared package currently has `"main": "./src/index.ts"` (raw TypeScript). Node.js cannot import `.ts` files at runtime, so the API's production build fails.
- Add `build` script to `packages/shared/package.json`: `"build": "tsc"`
- Update `"main"` to `"./dist/index.js"`, add `"types": "./dist/index.d.ts"`
- Ensure `tsconfig.json` has `outDir: "./dist"` and `rootDir: "./src"`
- **AC:** `pnpm build` produces valid JS in `packages/shared/dist/`, API production build can import shared package

---

## Phase 2: Database & ORM

**Goal:** Prisma schema with User and Game models, database client, Redis client.

### Task 2.1: Prisma Setup
- Install in `apps/api`: `prisma` (dev), `@prisma/client`
- Create `apps/api/prisma/schema.prisma`:
  - **User** model: id (uuid), email (unique), passwordHash, displayName, createdAt, updatedAt
  - **Game** model: id (uuid), userId (FK → User), igdbId, title, slug, coverUrl, summary, genres (String[]), platforms (String[]), releaseDate, rating (Float?), review, status (enum: backlog/playing/beaten), statusOrder (Int), createdAt, updatedAt
  - Indexes on Game: (userId, status), (userId, igdbId) unique
- Add scripts to api `package.json`: `db:generate`, `db:migrate`, `db:push`, `db:seed`, `postinstall: prisma generate`
- Run initial migration: `prisma migrate dev --name init`
- **AC:** `games` and `users` tables created in Docker Postgres, Prisma client generated

### Task 2.2: Database and Redis Client Singletons
- Create `apps/api/src/lib/db.ts` — Prisma client singleton (prevents connection exhaustion in dev)
- Create `apps/api/src/lib/redis.ts` — `ioredis` client (install `ioredis`)
- Create `apps/api/prisma/seed.ts` — seeds a test user + 5-10 sample games
- Update `apps/api/src/lib/index.ts` — re-export both clients
- **AC:** `pnpm --filter api db:seed` populates data, both clients connect to Docker services

---

## Phase 3: Authentication

**Goal:** Email/password registration and login with session cookies.

### Task 3.1: Auth Utilities & Security Hardening
- Install in `apps/api`: `bcrypt` (MIT) + `@types/bcrypt`, `@fastify/cookie` (MIT), `@fastify/session` (MIT), `connect-redis` (MIT), `@fastify/rate-limit` (MIT)
- Create `apps/api/src/lib/auth.ts`:
  - `hashPassword(password)` / `verifyPassword(password, hash)` using bcrypt
  - Session configuration for Fastify:
    - **Store:** Redis (using the Redis client from `lib/redis.ts` via `connect-redis`). Sessions survive server restarts.
    - **Cookie settings:** `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`
- Configure rate limiting in `server.ts`:
  - Auth endpoints: max 10 login attempts per minute per IP, max 5 registrations per hour per IP
- **AC:** Password hashing works, sessions stored in Redis, rate limiting active on auth endpoints

### Task 3.2: Auth tRPC Procedures
- Create `apps/api/src/trpc/context.ts` — context factory providing `prisma`, `redis`, `session` (user from session cookie)
- Create `apps/api/src/trpc/trpc.ts` — init tRPC with context, define `publicProcedure` and `protectedProcedure` (middleware that checks session for authenticated user)
- Create `apps/api/src/routers/auth.ts`:
  - `register` mutation — validate with `RegisterSchema`, hash password, create user, set session
  - `login` mutation — validate with `LoginSchema`, verify password, set session
  - `logout` mutation — destroy session
  - `me` query — return current user from session (or null)
- **AC:** Register → login → `me` returns user; invalid credentials rejected; logout clears session

---

## Phase 4: API Layer — tRPC, Game CRUD, IGDB

**Goal:** Full tRPC API with auth-protected game CRUD and IGDB search with Redis caching.

### Task 4.1: Register tRPC with Fastify
- Install in `apps/api`: `@trpc/server` v11 (Fastify adapter at `@trpc/server/adapters/fastify`)
- Restructure `apps/api/src/server.ts`:
  - Keep `GET /api/health` outside tRPC
  - Register `@fastify/cookie` and `@fastify/session`
  - Register `fastifyTRPCPlugin` at prefix `/api/trpc` with `appRouter` and `createContext`
- Configure `apps/api/package.json` exports: `"./routers": { "types": "./src/routers/index.ts" }` (for frontend type imports)
- **AC:** `/api/health` works, `/api/trpc/*` routes are live

### Task 4.2: Game CRUD Router
- Create `apps/api/src/routers/game.ts` (all procedures use `protectedProcedure`, scoped to `ctx.session.userId`):
  - `list` query — all games for current user, ordered by status + statusOrder
  - `getById` query — single game by ID (must belong to user)
  - `create` mutation — from IGDB data + initial status "backlog", validated with Zod
  - `update` mutation — partial update (status, statusOrder, rating, review)
  - `delete` mutation — hard delete by ID
  - `reorder` mutation — batch `{ id, statusOrder }[]` update in a transaction
  - `bulkSync` mutation — accepts outbox operations, applies LWW using `updatedAt`
- Create `apps/api/src/routers/index.ts` — combines all sub-routers into `appRouter`, exports `AppRouter` type
- **AC:** All CRUD ops work, scoped to authenticated user, validated with Zod

### Task 4.3: IGDB Integration with Redis Caching
- Create `apps/api/src/lib/igdb.ts`:
  - Twitch OAuth2 token acquisition (`client_credentials` grant), cached in Redis with TTL
  - `searchGames(query, limit?)` — checks Redis cache (`igdb:search:{query}`, 1hr TTL), calls IGDB API on miss, validates with `IgdbSearchResultSchema`
  - `getGameById(igdbId)` — same caching pattern
- Create `apps/api/src/routers/igdb.ts` (uses `protectedProcedure`):
  - `search` query — takes `{ query, limit? }`, returns validated results
  - `getById` query — takes `{ igdbId }`, returns single game
- Add `igdb: igdbRouter` to `appRouter`
- **AC:** IGDB search returns validated data, responses cached in Redis, rate limits respected

### Task 4.4: API Tests
- Create `apps/api/src/__tests__/game.test.ts` — CRUD via tRPC caller (use `createCallerFactory(appRouter)` — tRPC v11 API), conflict resolution in bulkSync
- Create `apps/api/src/__tests__/igdb.test.ts` — mocked IGDB calls (use `msw`), verify caching
- Create `apps/api/src/__tests__/auth.test.ts` — register, login, protected route access
- **AC:** All tests pass, run in CI

### Task 4.5: Environment Validation
- Create `apps/api/src/lib/env.ts` — Zod schema validating all environment variables at server startup
  - **Required:** `DATABASE_URL`, `REDIS_URL`
  - **Optional:** `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `API_PORT`
- Import and validate in `server.ts` before any server initialization
- Server refuses to start with clear error messages if required vars are missing
- **AC:** Server fails fast with descriptive errors for missing required env vars

### Task 4.6: CI Service Containers
- Update `.github/workflows/ci.yml`:
  - Add PostgreSQL 16 + Redis 7 service containers
  - Set `DATABASE_URL` and `REDIS_URL` env vars for test jobs
  - Run `pnpm test` with real database for API integration tests
- **AC:** CI runs API integration tests against real PostgreSQL + Redis

---

## Phase 5: Frontend Foundation — Routing, Data Fetching, UI Components

**Goal:** App shell with navigation, type-safe data fetching, and reusable UI components.

### Task 5.1: React Router
- Install in `apps/web`: `react-router-dom`
- Create `apps/web/src/router.tsx` — routes: `/` (Board), `/search` (Search), `/vibe` (Vibe), `/login`, `/register`
- Create `apps/web/src/layouts/RootLayout.tsx` — nav bar with links (Board, Search, Vibe), user menu (logout), `<Outlet />`
- Create placeholder pages: `BoardPage.tsx`, `SearchPage.tsx`, `VibePage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`
- Update `apps/web/src/main.tsx` — replace `<App />` with `<RouterProvider>`
- **AC:** Navigation works without full page reloads, active route highlighted

### Task 5.2: tRPC Client + TanStack Query
- Install in `apps/web`: `@trpc/client`, `@trpc/react-query`, `@tanstack/react-query` v5, `@tanstack/react-query-devtools`
  - Note: tRPC v11 requires TanStack Query v5. Key v5 differences: `isPending` replaces `isLoading`; `onSuccess`/`onError`/`onSettled` callbacks removed from `useQuery` (handle in `useEffect` or mutation callbacks instead)
- Create `apps/web/src/lib/trpc.ts` — tRPC React client with `httpBatchLink` pointing at `/api/trpc`
- Create `apps/web/src/providers/TrpcProvider.tsx` — wraps app with QueryClient + tRPC provider
- Create `apps/web/src/hooks/useAuth.ts` — uses `trpc.auth.me.useQuery()`, provides `user`, `isAuthenticated`, `isPending`
- Create `apps/web/src/components/AuthGuard.tsx` — redirects to `/login` if unauthenticated
- Update `main.tsx` — wrap `<RouterProvider>` with `<TrpcProvider>`
- **AC:** `trpc.game.list.useQuery()` returns typed data, end-to-end type safety verified

### Task 5.3: Auth Pages
- Create `apps/web/src/pages/LoginPage.tsx` — email + password form, calls `trpc.auth.login.useMutation()`, redirects to `/` on success
- Create `apps/web/src/pages/RegisterPage.tsx` — email + password + displayName form, calls `trpc.auth.register.useMutation()`, redirects to `/`
- **AC:** Registration creates user, login sets session cookie, protected routes redirect to login when unauthenticated

### Task 5.4: Shared UI Components
- Create in `apps/web/src/components/ui/`:
  - `Button.tsx` — variants (primary, secondary, ghost, destructive), sizes, loading state
  - `Card.tsx` — container with header/body/footer
  - `Input.tsx` — text input with label and error state
  - `Textarea.tsx` — multi-line input for reviews
  - `Badge.tsx` — status badges with color coding (backlog: blue, playing: amber, beaten: green)
  - `Modal.tsx` — accessible dialog
  - `Spinner.tsx` — loading spinner
  - `StarRating.tsx` — interactive 1-5 star rating
- Extend `tailwind.config.js` with custom status colors
- **AC:** All components render correctly, keyboard accessible

---

## Phase 6: Local-First Storage — Dexie.js

**Goal:** IndexedDB as browser-side source of truth, namespaced per user.

### Task 6.1: Dexie.js Setup
- Install in `apps/web`: `dexie`, `dexie-react-hooks`, `uuid`, `@types/uuid`
- Create `apps/web/src/lib/db.ts` — Dexie database:
  - Database name: `nextgame-{userId}` (namespaced per user)
  - Start at `version(1)` — document migration pattern in comments for future schema changes (increment version, add `.upgrade()` function)
  - Tables: `games` (indexed: id, igdbId, status, statusOrder, updatedAt), `outbox` (indexed: id, entityId, synced, createdAt)
  - Factory function `getDb(userId)` that returns/caches DB instance per user

### Task 6.2: Data Access Layer
- Create `apps/web/src/lib/game-store.ts`:
  - `getAllGames()`, `getGamesByStatus(status)`, `getGameById(id)` — read from IndexedDB
  - `upsertGame(game)` — write to IndexedDB + enqueue outbox entry
  - `deleteGame(id)` — delete from IndexedDB + enqueue outbox entry
  - `reorderGames(updates)` — batch reorder
  - `hydrate(games)` — bulk-replace IndexedDB with server data (initial sync)
- Create `apps/web/src/lib/outbox.ts`:
  - `enqueue(entry)`, `getPending()`, `markSynced(ids)`, `clearSynced()`

### Task 6.3: Offline-First React Hooks
- Create `apps/web/src/hooks/useGames.ts`:
  - Reads from IndexedDB instantly via `useLiveQuery` (Dexie)
  - Fetches from server via tRPC in background
  - On server response, merges into IndexedDB using `updatedAt` for LWW
  - Returns `{ games, isLoading, isOnline, error }`
- Create `apps/web/src/hooks/useGameMutations.ts`:
  - `useAddGame()`, `useUpdateGame()`, `useDeleteGame()`, `useReorderGames()`
  - Each: write to IndexedDB immediately, enqueue outbox, trigger background sync
- Create `apps/web/src/hooks/useOnlineStatus.ts` — reactive `navigator.onLine` tracking
- **Logout behavior:** On logout, delete the user's Dexie database via `Dexie.delete(\`nextgame-${userId}\`)`. Data re-syncs from server on next login.
- **AC:** Data loads instantly from IndexedDB on subsequent visits, writes work offline, outbox entries created, logout clears local data

---

## Phase 7: Core UI — Kanban Board, Search, Ratings/Reviews

**Goal:** The primary user-facing features.

### Task 7.1: Kanban Board
- Install in `apps/web`: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- Create `apps/web/src/components/board/`:
  - `KanbanBoard.tsx` — three columns, DndContext, handles drag-end (reorder or status change)
  - `BoardColumn.tsx` — column header with count, SortableContext, renders GameCards
  - `GameCard.tsx` — cover image, title, genres, platform badges, rating stars for playing/beaten
  - `GameDetailModal.tsx` — full detail view, status selector, rating input, review textarea, delete button
- Update `BoardPage.tsx` with `<KanbanBoard />`
- **AC:** Drag-and-drop within and between columns works, detail modal edits persist, responsive layout

### Task 7.2: Game Search & Addition
- Create `apps/web/src/components/search/`:
  - `SearchBar.tsx` — debounced input (300ms)
  - `SearchResults.tsx` — grid of results with "Add to Backlog" buttons
  - `SearchResultCard.tsx` — cover, title, genres, platforms, "In Library" indicator
- Update `SearchPage.tsx` with search UI
- **AC:** Typing triggers IGDB search, "Add to Backlog" creates game locally + enqueues sync, already-in-library games indicated

### Task 7.3: Ratings & Reviews
- Create `apps/web/src/components/game/`:
  - `RatingInput.tsx` — interactive 1-5 stars, hover preview, keyboard accessible
  - `ReviewEditor.tsx` — textarea with character count (max 5000), auto-save on blur
- Integrate into `GameDetailModal.tsx` (rating/review only enabled for playing/beaten status)
- **AC:** Rating and review persist in IndexedDB, sync via outbox

---

## Phase 8: Sync Engine — Outbox, Conflict Resolution, Chaos Toggle

**Goal:** Automatic background sync with LWW conflict resolution.

### Task 8.1: Immediate Sync Service
- Create `apps/web/src/lib/sync.ts` — SyncService class:
  - **Immediate sync on mutation:** Each local write (add, update, delete, reorder) triggers an immediate sync attempt (fire-and-forget)
  - On failure (offline), the entry stays in the outbox for later
  - On `online` event, flush all pending outbox entries
  - No background polling loop — sync is event-driven
  - Batches pending entries into `trpc.game.bulkSync` mutation
  - Server returns `{ applied, skipped, errors }` per operation
  - Marks applied as synced, fetches server version for skipped (server won), retries errors (max 3)
  - **Multi-tab coordination:** Use `navigator.locks.request('nextgame-sync', ...)` to ensure only one tab runs sync at a time. Other tabs' sync attempts queue behind the lock.
- Create `apps/web/src/providers/SyncProvider.tsx` — exposes sync state (syncing, lastSynced, pendingCount), listens for online/offline events
- **AC:** Writes sync immediately when online, outbox flushes on reconnect, multi-tab safe, sync status visible in UI

### Task 8.2: Server-Side Conflict Resolution
- Enhance `apps/api/src/routers/game.ts` `bulkSync`:
  - CREATE: insert if not exists (by userId + igdbId), skip if exists
  - UPDATE: compare `updatedAt` — newer wins
  - DELETE: delete if exists, skip if not
  - All in a single DB transaction
- **AC:** Conflicting updates resolve correctly, batch is atomic

### Task 8.3: Chaos Toggle (Dev Only)
- Create `apps/web/src/components/dev/ChaosToggle.tsx` — toggle simulating offline mode
- Create `apps/web/src/hooks/useChaos.ts` — overrides tRPC link to throw network errors when active
- Only rendered when `import.meta.env.DEV`
- **AC:** Toggling chaos mode simulates offline, disabling triggers sync flush, hidden in production

---

## Phase 9: AI Integration — Vibe Recommender

**Goal:** AI-powered game recommendations based on mood, time, and backlog.

### Task 9.1: Server-Side AI Orchestration
- Install in `apps/api`: `openai` (Apache 2.0), `@anthropic-ai/sdk` (MIT)
- Create `apps/api/src/lib/ai.ts`:
  - Provider abstraction: OpenAI first (if `OPENAI_API_KEY` is set), fallback to Anthropic (if `ANTHROPIC_API_KEY` is set). Clear error if neither configured.
  - `generateRecommendations({ mood, availableMinutes, preferredGenres, backlog })` → `VibeResponse`
  - System prompt: consider backlog, mood, time; recommend from backlog AND new games; explain reasoning; output valid JSON matching `VibeResponseSchema`
  - Parse + validate LLM output with Zod; retry once on validation failure
- Create `apps/api/src/routers/ai.ts`:
  - `vibe.recommend` mutation (protectedProcedure): validate input, fetch user library from Prisma, call `generateRecommendations()`, enrich results with IGDB data (covers, links)
- Add `ai: aiRouter` to `appRouter`
- **AC:** Works with either provider, output always validated, clear error when no API key configured

### Task 9.2: Vibe Recommender UI
- Create `apps/web/src/components/vibe/`:
  - `VibeForm.tsx` — mood input, session time slider (required, 15min–4hr+), game length selector (optional: short <10hr / medium 10-30hr / long 30+hr / any), optional genre filter, submit button with loading state
  - `RecommendationCard.tsx` — cover image, title, match score badge, reasoning text, session time estimate, review/trailer links, "Add to Backlog" or "Play Now" buttons
  - `RecommendationList.tsx` — list of cards with overall AI reasoning summary
- Update `VibePage.tsx` with full Vibe Recommender UI
- **AC:** Recommendations display with reasoning and actionable buttons, error states handled, offline message shown when disconnected

---

## Phase 10: Polish & Production Readiness

### Task 10.1: Virtualized Lists
- Install in `apps/web`: `@tanstack/react-virtual`
- Virtualize `BoardColumn.tsx` when column > 20 games
- Virtualize `SearchResults.tsx` for large result sets
- **AC:** 500+ games scroll at 60fps, drag-and-drop still works

### Task 10.2: Error Boundaries & Loading States
- Create `apps/web/src/components/ErrorBoundary.tsx` — friendly error with "Try Again"
- Create `apps/web/src/components/LoadingSkeleton.tsx` — skeleton UI for board, search, detail modal
- Wrap `<Outlet />` in `RootLayout.tsx` with `<ErrorBoundary>`
- **AC:** Errors caught gracefully, skeleton loading instead of blank space

### Task 10.3: Enhanced CI/CD
- Update `.github/workflows/ci.yml`:
  - Verify `prisma migrate deploy` works
  - Docker image build step (verify Dockerfile produces valid image)
- _(PostgreSQL + Redis service containers already added in Phase 4, Task 4.6)_
- **AC:** CI verifies migrations and Docker builds

### Task 10.5: Production Static File Serving
- Install in `apps/api`: `@fastify/static` (MIT), `@fastify/compress` (MIT)
- In production (`NODE_ENV=production`), serve `apps/web/dist/` as static files from Fastify
- Add SPA fallback: all non-`/api` routes serve `index.html` (for client-side routing)
- Update `apps/api/Dockerfile` to copy web build artifacts into the API container
- **AC:** Single container serves both API and frontend, SPA routing works in production

### Task 10.4: Comprehensive Test Suite
- `apps/web/src/__tests__/BoardPage.test.tsx` — columns render, correct grouping, drag-and-drop
- `apps/web/src/__tests__/SearchPage.test.tsx` — debounce, results, add-to-backlog
- `apps/web/src/__tests__/sync.test.ts` — outbox creation, flush, conflict resolution
- `apps/api/src/__tests__/ai.test.ts` — valid output, retry on invalid, missing key error
- **AC:** >70% coverage on critical paths, all pass in CI

---

## Phase Dependency Graph

```
Phase 1 (Foundation: Lint, Test, Schemas)
  └→ Phase 2 (Database & ORM)
       └→ Phase 3 (Authentication)
            └→ Phase 4 (API: tRPC + IGDB + CRUD)
                 └→ Phase 5 (Frontend Foundation: Router + tRPC Client + UI)
                      └→ Phase 6 (Local-First: Dexie.js)
                           └→ Phase 7 (Core UI: Kanban + Search + Ratings)
                                ├→ Phase 8 (Sync Engine)     ← can run in parallel
                                └→ Phase 9 (AI Integration)  ← can run in parallel
                                     └→ Phase 10 (Polish & Production)
```

## Critical Files (existing, to be modified)

| File | Phase | Change |
|------|-------|--------|
| `packages/shared/package.json` | 1 | Add build script, fix main/types fields for production |
| `packages/shared/src/index.ts` | 1 | Re-export all Zod schemas and types |
| `apps/api/src/server.ts` | 4 | Restructure: register session, tRPC plugin |
| `apps/api/src/lib/index.ts` | 2 | Re-export Prisma + Redis clients |
| `apps/api/src/routes/index.ts` | 4 | Replace with tRPC router registration |
| `apps/web/src/main.tsx` | 5 | Replace App with RouterProvider + TrpcProvider |
| `apps/web/src/App.tsx` | 5 | Delete (replaced by router) |
| `apps/web/tailwind.config.js` | 5 | Add status colors, animations |
| `turbo.json` | 1 | Add `test` task |
| `.github/workflows/ci.yml` | 1, 4 | Add test step, service containers (PostgreSQL + Redis) |

## All New Dependencies (Licenses Verified)

| Package | Where | License |
|---------|-------|---------|
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | root (dev) | MIT |
| `vitest` | root (dev) | MIT |
| `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom` | web (dev) | MIT |
| `prisma` | api (dev) | Apache 2.0 |
| `@prisma/client` | api | Apache 2.0 |
| `ioredis` | api | MIT |
| `bcrypt`, `@types/bcrypt` | api | MIT |
| `@fastify/cookie` | api | MIT |
| `@fastify/session` | api | MIT |
| `connect-redis` | api | MIT |
| `@fastify/rate-limit` | api | MIT |
| `@trpc/server` | api | MIT |
| `@trpc/client`, `@trpc/react-query` | web | MIT |
| `@tanstack/react-query`, `@tanstack/react-query-devtools` | web | MIT |
| `react-router-dom` | web | MIT |
| `dexie`, `dexie-react-hooks` | web | Apache 2.0 |
| `uuid`, `@types/uuid` | web | MIT |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | web | MIT |
| `openai` | api | Apache 2.0 |
| `@anthropic-ai/sdk` | api | MIT |
| `@tanstack/react-virtual` | web | MIT |
| `msw` | api (dev) | MIT |
| `@fastify/static` | api | MIT |
| `@fastify/compress` | api | MIT |

## Verification

After each phase, verify with:
1. `pnpm typecheck` — no TypeScript errors
2. `pnpm lint` — no lint errors (after Phase 1)
3. `pnpm test` — all tests pass (after Phase 1)
4. `pnpm build` — successful production build
5. Manual smoke test: `docker compose up -d && pnpm dev` — app runs end-to-end
