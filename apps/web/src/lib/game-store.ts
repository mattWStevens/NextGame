import { Game, GameReorder, GameStatus } from '@nextgame/shared';
import { getDb } from './db';

export const createGameStore = (userId: string) => {
    const db = getDb(userId);

    return {
        getAllGames: async () => {
            return await db.games.toArray();
        },
        getGamesByStatus: async (status: GameStatus) => {
            return await db.games.where('status').equals(status).toArray();
        },
        getGameById: async (id: string) => {
            return await db.games.get(id);
        },
        upsertGame: async (game: Game) => {
            const { id, ...updatedFields } = game;
            await db.games.upsert(id, updatedFields);
        },
        deleteGame: async (id: string) => {
            await db.games.delete(id);
        },
        reorderGames: async (updates: GameReorder[]) => {
            await db.transaction('rw', db.games, async () => {
                for (const update of updates) {
                    const { id, ...rest } = update;
                    await db.games.update(id, rest);
                }
            });
        },
        hydrate: async (games: Game[]) => {
            // NOTE: this clears/discards all local games before adding the supplied ones
            // regardless of whether or not they have been synced yet. The outbox table
            // is untouched — callers must flush or clear pending outbox entries before
            // hydrating, otherwise queued mutations will be re-applied on top of the
            // freshly hydrated server state.
            await db.transaction('rw', db.games, async () => {
                await db.games.clear();
                await db.games.bulkPut(games);
            });
        },
    };
};

export type GameStore = ReturnType<typeof createGameStore>;
