import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OutboxEntry } from '@nextgame/shared';
import { createOutboxStore, OutboxStore } from '../outbox';
import { removeDb } from '../db';

const makeEntry = (overrides: Partial<OutboxEntry> = {}): OutboxEntry =>
    ({
        id: crypto.randomUUID(),
        entityId: crypto.randomUUID(),
        synced: false,
        createdAt: new Date().toISOString(),
        clientUpdatedAt: new Date().toISOString(),
        operation: 'delete',
        ...overrides,
    }) as OutboxEntry;

describe('OutboxStore', () => {
    let userId: string;
    let store: OutboxStore;

    beforeEach(() => {
        userId = crypto.randomUUID();
        store = createOutboxStore(userId);
    });

    afterEach(async () => {
        await removeDb(userId);
    });

    describe('enqueue', () => {
        it('adds an entry to the outbox and returns its key', async () => {
            const entry = makeEntry();
            const key = await store.enqueue(entry);
            expect(key).toBeDefined();
            const pending = await store.getPending();
            expect(pending).toHaveLength(1);
            expect(pending[0].id).toBe(entry.id);
        });
    });

    describe('getPending', () => {
        it('returns only unsynced entries', async () => {
            const unsynced = makeEntry({ synced: false });
            const synced = makeEntry({ synced: true });
            await store.enqueue(unsynced);
            await store.enqueue(synced);

            const result = await store.getPending();
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(unsynced.id);
        });

        it('returns empty array when all entries are synced', async () => {
            await store.enqueue(makeEntry({ synced: true }));
            expect(await store.getPending()).toEqual([]);
        });
    });

    describe('markSynced', () => {
        it('marks entries as synced and returns them in succeeded', async () => {
            const a = makeEntry();
            const b = makeEntry();
            await store.enqueue(a);
            await store.enqueue(b);

            const result = await store.markSynced([a.id, b.id]);
            expect(result.succeeded.sort()).toEqual([a.id, b.id].sort());
            expect(result.failed).toEqual([]);
        });

        it('puts non-existent IDs in failed without throwing', async () => {
            const missingId = crypto.randomUUID();
            const result = await store.markSynced([missingId]);
            expect(result.failed).toContain(missingId);
            expect(result.succeeded).toEqual([]);
        });

        it('handles a mix of valid and invalid IDs correctly', async () => {
            const valid = makeEntry();
            await store.enqueue(valid);
            const missingId = crypto.randomUUID();

            const result = await store.markSynced([valid.id, missingId]);
            expect(result.succeeded).toContain(valid.id);
            expect(result.failed).toContain(missingId);
        });
    });

    describe('clearSynced', () => {
        it('removes synced entries and keeps unsynced ones', async () => {
            const unsynced = makeEntry({ synced: false });
            const synced = makeEntry({ synced: true });
            await store.enqueue(unsynced);
            await store.enqueue(synced);

            await store.clearSynced();

            const pending = await store.getPending();
            expect(pending).toHaveLength(1);
            expect(pending[0].id).toBe(unsynced.id);
        });

        it('does nothing when there are no synced entries', async () => {
            await store.enqueue(makeEntry({ synced: false }));
            await store.clearSynced();
            expect(await store.getPending()).toHaveLength(1);
        });
    });
});
