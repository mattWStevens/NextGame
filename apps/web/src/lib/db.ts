import { Game, OutboxEntry } from '@nextgame/shared';
import { Dexie, type EntityTable } from 'dexie';

interface NextGameDatabase extends Dexie {
    games: EntityTable<Game, 'id'>;
    outbox: EntityTable<OutboxEntry, 'id'>;
}

const dbMap = new Map<string, NextGameDatabase>();

export const getDb = (userId: string) => {
    const existing = dbMap.get(userId);
    if (existing) return existing;

    const db = new Dexie(`nextgame-${userId}`) as NextGameDatabase;

    db.version(1).stores({
        games: 'id, igdbId, status, statusOrder, updatedAt',
        outbox: 'id, entityId, synced, createdAt',
    });

    /* 
    To update schema, increment version and provide '.upgrade()' function.

    EX: 

    db.version(1).stores({ ... }); // keep this

    // Add new version below
    db.version(2).stores({
        games: 'id, igdbId, status, statusOrder, updatedAt',
        outbox: 'id, entityId, synced, createdAt, newIndex',
        newTable: 'id'
    }).upgrade(tx => {
        return tx.table('games').toCollection().modify(game => {
            // Changes here.
        });
    }); 
    */

    dbMap.set(userId, db);

    return db;
};

export const removeDb = async (userId: string) => {
    const db = dbMap.get(userId);
    db?.close();
    dbMap.delete(userId);
    await Dexie.delete(`nextgame-${userId}`);
};
