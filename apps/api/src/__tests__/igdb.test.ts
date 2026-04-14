import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

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
import { redis } from '../lib/redis.js';
import type { Context } from '../trpc/context.js';

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const GAMES_URL = 'https://api.igdb.com/v4/games';
const ACCESS_TOKEN = 'test-access-token';
const IGDB_ID = 1942;

const mockIgdbGame = {
    id: IGDB_ID,
    name: 'The Legend of Zelda',
    slug: 'the-legend-of-zelda',
    cover: {
        id: 100,
        url: '//images.igdb.com/igdb/image/upload/t_cover_big/abc123.jpg',
    },
    genres: [{ id: 31, name: 'Adventure' }],
    platforms: [{ id: 7, name: 'Nintendo Entertainment System' }],
    rating: 90.5,
};

const mockTokenResponse = {
    access_token: ACCESS_TOKEN,
    expires_in: 3600,
    token_type: 'bearer',
};

const server = setupServer(
    http.post(TOKEN_URL, () => HttpResponse.json(mockTokenResponse)),
    http.post(GAMES_URL, () => HttpResponse.json([mockIgdbGame])),
);

beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
    // Restore default: all cache misses
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockResolvedValue('OK');
});

afterAll(() => {
    server.close();
});

const mockSessionUser = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'test@example.com',
    displayName: 'Test User',
};

function buildCtx(): Context {
    return {
        prisma: {},
        redis: { get: vi.fn(), set: vi.fn() },
        req: { ip: '127.0.0.1' },
        session: {
            get: vi.fn((key: string) => (key === 'user' ? mockSessionUser : undefined)),
            set: vi.fn(),
            destroy: vi.fn(),
        },
        user: mockSessionUser,
    } as unknown as Context;
}

describe('igdb.search', () => {
    it('fetches from IGDB on a cache miss and caches the results', async () => {
        // All redis.get calls return null → cache misses
        vi.mocked(redis.get).mockResolvedValue(null);

        let igdbRequestMade = false;
        server.use(
            http.post(GAMES_URL, () => {
                igdbRequestMade = true;
                return HttpResponse.json([mockIgdbGame]);
            }),
        );

        const caller = appRouter.createCaller(buildCtx());
        const results = await caller.igdb.search({ query: 'zelda', limit: 5 });

        expect(igdbRequestMade).toBe(true);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({ id: IGDB_ID, name: 'The Legend of Zelda' });

        // Results should be stored in Redis
        expect(redis.set).toHaveBeenCalledWith(
            expect.stringContaining('igdb:search:'),
            expect.any(String),
            expect.objectContaining({ EX: 3600 }),
        );
    });

    it('returns cached results on a cache hit without making an HTTP request', async () => {
        const cachedResults = [mockIgdbGame];
        // First call: search cache hit
        vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(cachedResults));

        let igdbRequestMade = false;
        server.use(
            http.post(GAMES_URL, () => {
                igdbRequestMade = true;
                return HttpResponse.json([mockIgdbGame]);
            }),
        );

        const caller = appRouter.createCaller(buildCtx());
        const results = await caller.igdb.search({ query: 'zelda' });

        expect(igdbRequestMade).toBe(false);
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe(IGDB_ID);

        // No new caching should occur
        expect(redis.set).not.toHaveBeenCalled();
    });

    it('uses the access token from Redis cache when available', async () => {
        // search cache: miss; access token: hit
        vi.mocked(redis.get)
            .mockResolvedValueOnce(null) // search cache miss
            .mockResolvedValueOnce(ACCESS_TOKEN); // access token cache hit

        let tokenRequestMade = false;
        server.use(
            http.post(TOKEN_URL, () => {
                tokenRequestMade = true;
                return HttpResponse.json(mockTokenResponse);
            }),
            http.post(GAMES_URL, () => HttpResponse.json([mockIgdbGame])),
        );

        const caller = appRouter.createCaller(buildCtx());
        await caller.igdb.search({ query: 'zelda' });

        expect(tokenRequestMade).toBe(false);
    });
});

describe('igdb.getById', () => {
    it('fetches from IGDB on a cache miss and caches the result', async () => {
        vi.mocked(redis.get).mockResolvedValue(null);

        let igdbRequestMade = false;
        server.use(
            http.post(GAMES_URL, () => {
                igdbRequestMade = true;
                return HttpResponse.json([mockIgdbGame]);
            }),
        );

        const caller = appRouter.createCaller(buildCtx());
        const result = await caller.igdb.getById({ igdbId: IGDB_ID });

        expect(igdbRequestMade).toBe(true);
        expect(result).toMatchObject({ id: IGDB_ID, name: 'The Legend of Zelda' });

        expect(redis.set).toHaveBeenCalledWith(
            `igdb:game:${String(IGDB_ID)}`,
            expect.any(String),
            expect.objectContaining({ EX: 3600 }),
        );
    });

    it('returns the cached game on a cache hit without an HTTP request', async () => {
        vi.mocked(redis.get).mockResolvedValueOnce(JSON.stringify(mockIgdbGame));

        let igdbRequestMade = false;
        server.use(
            http.post(GAMES_URL, () => {
                igdbRequestMade = true;
                return HttpResponse.json([mockIgdbGame]);
            }),
        );

        const caller = appRouter.createCaller(buildCtx());
        const result = await caller.igdb.getById({ igdbId: IGDB_ID });

        expect(igdbRequestMade).toBe(false);
        expect(result.id).toBe(IGDB_ID);
        expect(redis.set).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when IGDB returns no results', async () => {
        vi.mocked(redis.get).mockResolvedValue(null);
        server.use(http.post(GAMES_URL, () => HttpResponse.json([])));

        const caller = appRouter.createCaller(buildCtx());

        await expect(caller.igdb.getById({ igdbId: 99999 })).rejects.toMatchObject({
            code: 'NOT_FOUND',
        });
    });

    it('upgrades the cover image URL to t_cover_big size', async () => {
        vi.mocked(redis.get).mockResolvedValue(null);

        const caller = appRouter.createCaller(buildCtx());
        const result = await caller.igdb.getById({ igdbId: IGDB_ID });

        expect(result.cover?.url).toContain('t_cover_big');
        expect(result.cover?.url).not.toContain('t_thumb');
    });
});
