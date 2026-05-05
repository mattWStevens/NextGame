import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Game, GameStatus } from '@nextgame/shared';
import { createGameStore, GameStore } from '../game-store';
import { removeDb } from '../db';

const makeGame = (overrides: Partial<Game> = {}): Game => ({
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    igdbId: 1,
    title: 'Test Game',
    status: 'backlog',
    statusOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

describe('GameStore', () => {
    let userId: string;
    let store: GameStore;

    beforeEach(() => {
        userId = crypto.randomUUID();
        store = createGameStore(userId);
    });

    afterEach(async () => {
        await removeDb(userId);
    });

    describe('getAllGames', () => {
        it('returns empty array when no games exist', async () => {
            expect(await store.getAllGames()).toEqual([]);
        });

        it('returns all games after upsert', async () => {
            const a = makeGame();
            const b = makeGame();
            await store.upsertGame(a);
            await store.upsertGame(b);
            const result = await store.getAllGames();
            expect(result).toHaveLength(2);
        });
    });

    describe('getGamesByStatus', () => {
        it('returns only games with the given status', async () => {
            const backlog = makeGame({ status: 'backlog' });
            const playing = makeGame({ status: 'playing' });
            const beaten = makeGame({ status: 'beaten' });
            await store.upsertGame(backlog);
            await store.upsertGame(playing);
            await store.upsertGame(beaten);

            const result = await store.getGamesByStatus('playing' as GameStatus);
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(playing.id);
        });

        it('returns empty array when no games match the status', async () => {
            await store.upsertGame(makeGame({ status: 'backlog' }));
            expect(await store.getGamesByStatus('beaten' as GameStatus)).toEqual([]);
        });
    });

    describe('getGameById', () => {
        it('returns the game when found', async () => {
            const game = makeGame();
            await store.upsertGame(game);
            const result = await store.getGameById(game.id);
            expect(result?.id).toBe(game.id);
        });

        it('returns undefined when not found', async () => {
            expect(await store.getGameById(crypto.randomUUID())).toBeUndefined();
        });
    });

    describe('upsertGame', () => {
        it('inserts a new game', async () => {
            const game = makeGame();
            await store.upsertGame(game);
            expect(await store.getGameById(game.id)).toBeDefined();
        });

        it('updates an existing game', async () => {
            const game = makeGame({ title: 'Original' });
            await store.upsertGame(game);
            await store.upsertGame({ ...game, title: 'Updated' });
            const result = await store.getGameById(game.id);
            expect(result?.title).toBe('Updated');
        });
    });

    describe('deleteGame', () => {
        it('removes the game', async () => {
            const game = makeGame();
            await store.upsertGame(game);
            await store.deleteGame(game.id);
            expect(await store.getGameById(game.id)).toBeUndefined();
        });
    });

    describe('reorderGames', () => {
        it('updates statusOrder for each supplied entry', async () => {
            const a = makeGame({ statusOrder: 0 });
            const b = makeGame({ statusOrder: 1 });
            await store.upsertGame(a);
            await store.upsertGame(b);

            await store.reorderGames([
                { id: a.id, statusOrder: 5 },
                { id: b.id, statusOrder: 10 },
            ]);

            expect((await store.getGameById(a.id))?.statusOrder).toBe(5);
            expect((await store.getGameById(b.id))?.statusOrder).toBe(10);
        });

        it('does not modify other fields', async () => {
            const game = makeGame({ title: 'Untouched', statusOrder: 0 });
            await store.upsertGame(game);
            await store.reorderGames([{ id: game.id, statusOrder: 99 }]);
            expect((await store.getGameById(game.id))?.title).toBe('Untouched');
        });
    });

    describe('hydrate', () => {
        it('replaces all existing games with the supplied array', async () => {
            const old = makeGame({ title: 'Old' });
            await store.upsertGame(old);

            const fresh = [makeGame({ title: 'Fresh A' }), makeGame({ title: 'Fresh B' })];
            await store.hydrate(fresh);

            const all = await store.getAllGames();
            expect(all).toHaveLength(2);
            expect(all.map((g) => g.title).sort()).toEqual(['Fresh A', 'Fresh B']);
            expect(await store.getGameById(old.id)).toBeUndefined();
        });

        it('clears all games when hydrated with empty array', async () => {
            await store.upsertGame(makeGame());
            await store.hydrate([]);
            expect(await store.getAllGames()).toEqual([]);
        });
    });
});
