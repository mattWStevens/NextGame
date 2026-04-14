import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma, redis, cleanDatabase, createTestCaller } from './helpers.js';
import type { Session } from 'fastify';

type SessionUser = NonNullable<Session['user']>;

const mockIgdbGame = {
    id: 1942,
    name: 'The Legend of Zelda',
    slug: 'the-legend-of-zelda',
    cover: { id: 100, url: '//images.igdb.com/igdb/image/upload/t_cover_big/abc123.jpg' },
    genres: [{ id: 31, name: 'Adventure' }],
    platforms: [{ id: 7, name: 'Nintendo Entertainment System' }],
};

describe('game (integration)', () => {
    let sessionUser: SessionUser;

    beforeAll(async () => {
        await cleanDatabase();
        sessionUser = await createTestCaller().auth.register({
            email: 'gamer@example.com',
            displayName: 'Gamer',
            password: 'password123',
        });
    });

    beforeEach(async () => {
        await prisma.game.deleteMany({ where: { userId: sessionUser.id } });
    });

    afterAll(async () => {
        await cleanDatabase();
        await prisma.$disconnect();
        await redis.quit();
    });

    it('create adds a game to the user backlog', async () => {
        const game = await createTestCaller(sessionUser).game.create(mockIgdbGame);

        expect(game.title).toBe('The Legend of Zelda');
        expect(game.status).toBe('backlog');
        expect(game.userId).toBe(sessionUser.id);
        expect(game.id).toBeDefined();

        const dbGame = await prisma.game.findFirst({ where: { userId: sessionUser.id } });
        expect(dbGame).not.toBeNull();
    });

    it('list returns games ordered by status then statusOrder', async () => {
        const caller = createTestCaller(sessionUser);
        await caller.game.create(mockIgdbGame);
        await caller.game.create({ ...mockIgdbGame, id: 1943, name: 'Zelda II', slug: 'zelda-ii' });

        const games = await caller.game.list();

        expect(games).toHaveLength(2);
        expect(games.every((g) => g.status === 'backlog')).toBe(true);
        // statusOrder should be ascending for same status
        expect(games[0].statusOrder).toBeLessThan(games[1].statusOrder);
    });

    it('getById returns the correct game', async () => {
        const caller = createTestCaller(sessionUser);
        const created = await caller.game.create(mockIgdbGame);
        const fetched = await caller.game.getById({ id: created.id });

        expect(fetched.id).toBe(created.id);
        expect(fetched.title).toBe('The Legend of Zelda');
    });

    it('getById throws NOT_FOUND for a game belonging to another user', async () => {
        const otherUser = await createTestCaller().auth.register({
            email: 'other@example.com',
            displayName: 'Other',
            password: 'password123',
        });
        const otherGame = await createTestCaller(otherUser).game.create(mockIgdbGame);

        await expect(
            createTestCaller(sessionUser).game.getById({ id: otherGame.id }),
        ).rejects.toThrow();
    });

    it('update changes the game status', async () => {
        const created = await createTestCaller(sessionUser).game.create(mockIgdbGame);
        const updated = await createTestCaller(sessionUser).game.update({
            id: created.id,
            status: 'playing',
        });

        expect(updated.status).toBe('playing');

        const dbGame = await prisma.game.findFirst({ where: { id: created.id } });
        expect(dbGame?.status).toBe('playing');
    });

    it('delete removes the game', async () => {
        const created = await createTestCaller(sessionUser).game.create(mockIgdbGame);
        await createTestCaller(sessionUser).game.delete({ id: created.id });

        const games = await createTestCaller(sessionUser).game.list();
        expect(games).toHaveLength(0);
    });

    it('create throws UNAUTHORIZED when not authenticated', async () => {
        await expect(createTestCaller().game.create(mockIgdbGame)).rejects.toThrow();
    });
});
