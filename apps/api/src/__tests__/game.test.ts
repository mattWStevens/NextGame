import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('rate-limiter-flexible', () => ({
    RateLimiterRedis: class {
        consume = vi.fn().mockResolvedValue({});
    },
}));

vi.mock('../lib/redis.js', () => ({
    redis: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
    },
}));

vi.mock('../lib/db.js', () => ({
    prisma: {},
}));

import { appRouter } from '../routers/index.js';
import type { IgdbGame } from '@nextgame/shared';
import type { Context } from '../trpc/context.js';

// Valid UUID v4 format: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const GAME_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OTHER_GAME_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ENTRY_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const IGDB_ID = 12345;

const mockSessionUser = {
    id: USER_ID,
    email: 'test@example.com',
    displayName: 'Test User',
};

const NOW = new Date('2024-06-01T00:00:00.000Z');
const EARLIER = new Date('2024-01-01T00:00:00.000Z');

const mockPrismaGame = {
    id: GAME_ID,
    userId: USER_ID,
    clientId: null,
    igdbId: IGDB_ID,
    title: 'Test Game',
    slug: 'test-game',
    coverUrl: 'https://example.com/cover.jpg',
    summary: 'A test game',
    genres: ['Action'],
    platforms: ['PC'],
    releaseDate: null,
    rating: null,
    review: null,
    status: 'backlog' as const,
    statusOrder: 0,
    createdAt: EARLIER,
    updatedAt: EARLIER,
};

const mockIgdbGame: IgdbGame = {
    id: IGDB_ID,
    name: 'Test Game',
    slug: 'test-game',
    cover: { id: 1, url: '//images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg' },
    genres: [{ id: 1, name: 'Action' }],
    platforms: [{ id: 1, name: 'PC' }],
};

function buildMockTx() {
    return {
        game: {
            aggregate: vi.fn(),
            create: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            upsert: vi.fn(),
        },
    };
}

function buildCtx() {
    const mockTx = buildMockTx();

    const prisma = {
        $queryRaw: vi.fn(),
        $transaction: vi.fn().mockImplementation(async (arg: unknown) => {
            if (typeof arg === 'function') {
                return await (arg as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
            }
            return await Promise.all(arg as Promise<unknown>[]);
        }),
        game: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            aggregate: vi.fn(),
            upsert: vi.fn(),
        },
    };

    const session = {
        get: vi.fn((key: string) => (key === 'user' ? mockSessionUser : undefined)),
        set: vi.fn(),
        destroy: vi.fn(),
    };

    const ctx = {
        prisma,
        redis: { get: vi.fn(), set: vi.fn() },
        req: { ip: '127.0.0.1' },
        session,
        user: mockSessionUser,
    } as unknown as Context;

    return { ctx, prisma, mockTx };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('game.list', () => {
    it('returns all games for the authenticated user', async () => {
        const { ctx, prisma } = buildCtx();
        vi.mocked(prisma.$queryRaw).mockResolvedValue([mockPrismaGame]);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.list();

        expect(prisma.$queryRaw).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            id: GAME_ID,
            igdbId: IGDB_ID,
            title: 'Test Game',
            status: 'backlog',
        });
    });

    it('throws UNAUTHORIZED without a session user', async () => {
        const { ctx } = buildCtx();
        const unauthCtx = { ...ctx, user: undefined } as unknown as Context;
        const caller = appRouter.createCaller(unauthCtx);

        await expect(caller.game.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
});

describe('game.getById', () => {
    it('returns a game by id', async () => {
        const { ctx, prisma } = buildCtx();
        vi.mocked(prisma.game.findFirst).mockResolvedValue(mockPrismaGame);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.getById({ id: GAME_ID });

        expect(prisma.game.findFirst).toHaveBeenCalledWith({
            where: { userId: USER_ID, id: GAME_ID },
        });
        expect(result.id).toBe(GAME_ID);
    });

    it('throws NOT_FOUND when game does not exist', async () => {
        const { ctx, prisma } = buildCtx();
        vi.mocked(prisma.game.findFirst).mockResolvedValue(null);
        const caller = appRouter.createCaller(ctx);

        await expect(caller.game.getById({ id: GAME_ID })).rejects.toMatchObject({
            code: 'NOT_FOUND',
        });
    });
});

describe('game.create', () => {
    it('creates a game in backlog with sparse statusOrder', async () => {
        const { ctx, mockTx } = buildCtx();
        // Empty backlog → statusOrder = -1000 + 1000 = 0
        vi.mocked(mockTx.game.aggregate).mockResolvedValue({ _max: { statusOrder: null } });
        vi.mocked(mockTx.game.create).mockResolvedValue(mockPrismaGame);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.create(mockIgdbGame);

        expect(mockTx.game.aggregate).toHaveBeenCalled();

        const createArg = vi.mocked(mockTx.game.create).mock.calls[0]?.[0] as
            | { data: Record<string, unknown> }
            | undefined;
        expect(createArg?.data).toMatchObject({
            status: 'backlog',
            statusOrder: 0,
            igdbId: IGDB_ID,
            userId: USER_ID,
        });
        expect(result.status).toBe('backlog');
    });

    it('appends to existing backlog using sparse increments', async () => {
        const { ctx, mockTx } = buildCtx();
        // Existing max is 1000 → new statusOrder = 2000
        vi.mocked(mockTx.game.aggregate).mockResolvedValue({ _max: { statusOrder: 1000 } });
        vi.mocked(mockTx.game.create).mockResolvedValue({ ...mockPrismaGame, statusOrder: 2000 });
        const caller = appRouter.createCaller(ctx);

        await caller.game.create(mockIgdbGame);

        const createArg = vi.mocked(mockTx.game.create).mock.calls[0]?.[0] as
            | { data: Record<string, unknown> }
            | undefined;
        expect(createArg?.data).toMatchObject({ statusOrder: 2000 });
    });
});

describe('game.update', () => {
    it('updates allowed fields and returns the updated game', async () => {
        const { ctx, prisma } = buildCtx();
        vi.mocked(prisma.game.update).mockResolvedValue({ ...mockPrismaGame, status: 'playing' });
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.update({ id: GAME_ID, status: 'playing' });

        expect(prisma.game.update).toHaveBeenCalledWith({
            where: { id: GAME_ID, userId: USER_ID },
            data: { status: 'playing' },
        });
        expect(result.status).toBe('playing');
    });
});

describe('game.delete', () => {
    it('deletes the game and returns it', async () => {
        const { ctx, prisma } = buildCtx();
        vi.mocked(prisma.game.delete).mockResolvedValue(mockPrismaGame);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.delete({ id: GAME_ID });

        expect(prisma.game.delete).toHaveBeenCalledWith({
            where: { id: GAME_ID, userId: USER_ID },
        });
        expect(result.id).toBe(GAME_ID);
    });
});

describe('game.reorder', () => {
    it('batch-updates statusOrder for each game', async () => {
        const { ctx, prisma } = buildCtx();
        vi.mocked(prisma.game.update)
            .mockResolvedValueOnce({ ...mockPrismaGame, statusOrder: 100 })
            .mockResolvedValueOnce({ ...mockPrismaGame, id: OTHER_GAME_ID, statusOrder: 200 });
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.reorder([
            { id: GAME_ID, statusOrder: 100 },
            { id: OTHER_GAME_ID, statusOrder: 200 },
        ]);

        expect(prisma.$transaction).toHaveBeenCalled();
        expect(prisma.game.update).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(2);
    });
});

describe('game.bulkSync', () => {
    const baseEntry = {
        id: ENTRY_ID,
        entityId: GAME_ID,
        synced: false,
        createdAt: NOW.toISOString(),
        clientUpdatedAt: NOW.toISOString(),
    };

    it('applies an UPDATE when the client entry is newer than the server', async () => {
        const { ctx, mockTx } = buildCtx();
        // Server has an older updatedAt (EARLIER)
        vi.mocked(mockTx.game.findFirst).mockResolvedValue(mockPrismaGame);
        vi.mocked(mockTx.game.update).mockResolvedValue(mockPrismaGame);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.bulkSync([
            {
                ...baseEntry,
                operation: 'update',
                // clientUpdatedAt (NOW) > server updatedAt (EARLIER) → applied
                clientUpdatedAt: NOW.toISOString(),
                payload: { id: GAME_ID, status: 'playing' },
            },
        ]);

        expect(result.applied).toContain(GAME_ID);
        expect(result.rejected).toHaveLength(0);
        expect(result.skipped).toHaveLength(0);
    });

    it('rejects an UPDATE when the server entry is newer (server wins)', async () => {
        const { ctx, mockTx } = buildCtx();
        // Server has a NEWER updatedAt (NOW)
        vi.mocked(mockTx.game.findFirst).mockResolvedValue({ ...mockPrismaGame, updatedAt: NOW });
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.bulkSync([
            {
                ...baseEntry,
                operation: 'update',
                // clientUpdatedAt (EARLIER) < server updatedAt (NOW) → rejected
                clientUpdatedAt: EARLIER.toISOString(),
                payload: { id: GAME_ID, status: 'playing' },
            },
        ]);

        expect(result.rejected).toHaveLength(1);
        expect(result.applied).toHaveLength(0);
    });

    it('skips an UPDATE when the game does not exist on the server', async () => {
        const { ctx, mockTx } = buildCtx();
        vi.mocked(mockTx.game.findFirst).mockResolvedValue(null);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.bulkSync([
            {
                ...baseEntry,
                operation: 'update',
                clientUpdatedAt: NOW.toISOString(),
                payload: { id: GAME_ID, status: 'playing' },
            },
        ]);

        expect(result.skipped).toContain(GAME_ID);
        expect(result.applied).toHaveLength(0);
    });

    it('applies a CREATE by upserting the game', async () => {
        const { ctx, mockTx } = buildCtx();
        vi.mocked(mockTx.game.aggregate).mockResolvedValue({ _max: { statusOrder: null } });
        vi.mocked(mockTx.game.upsert).mockResolvedValue(mockPrismaGame);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.bulkSync([
            {
                ...baseEntry,
                operation: 'create',
                payload: mockIgdbGame,
            },
        ]);

        expect(result.applied).toContain(GAME_ID);
        expect(mockTx.game.upsert).toHaveBeenCalled();
    });

    it('applies a DELETE', async () => {
        const { ctx, mockTx } = buildCtx();
        vi.mocked(mockTx.game.delete).mockResolvedValue(mockPrismaGame);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.bulkSync([
            {
                ...baseEntry,
                operation: 'delete',
            },
        ]);

        expect(result.applied).toContain(GAME_ID);
        expect(mockTx.game.delete).toHaveBeenCalledWith({
            where: { id: GAME_ID, userId: USER_ID },
        });
    });

    it('skips a DELETE when the game no longer exists on the server', async () => {
        const { ctx, mockTx } = buildCtx();
        vi.mocked(mockTx.game.delete).mockRejectedValue(new Error('Record not found'));
        const caller = appRouter.createCaller(ctx);

        const result = await caller.game.bulkSync([
            {
                ...baseEntry,
                operation: 'delete',
            },
        ]);

        expect(result.skipped).toContain(GAME_ID);
        expect(result.applied).toHaveLength(0);
    });
});
