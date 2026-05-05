import { OutboxEntry } from '@nextgame/shared';
import { getDb } from './db';

export interface MarkSyncedResponse {
    succeeded: string[];
    failed: string[];
}

export const createOutboxStore = (userId: string) => {
    const db = getDb(userId);

    return {
        enqueue: async (entry: OutboxEntry) => {
            const newEntryId = await db.outbox.add(entry);
            return newEntryId;
        },
        getPending: async () => {
            // .equals() does not support booleans - using a filter here instead
            // of updating the schema to 0/1s as the outbox is generally small
            // and it avoids the added complexity of having to update our schema entirely.
            return await db.outbox.filter((entry) => !entry.synced).toArray();
        },
        // NOTE: unlike other methods, markSynced never throws — errors are caught
        // per-ID and surfaced in the returned MarkSyncedResponse. Callers must
        // inspect the result rather than relying on a thrown exception.
        markSynced: async (ids: string[]): Promise<MarkSyncedResponse> => {
            const result: MarkSyncedResponse = {
                succeeded: [],
                failed: [],
            };

            for (const id of ids) {
                try {
                    const count = await db.outbox.update(id, {
                        synced: true,
                    });
                    if (count === 0) result.failed.push(id);
                    else result.succeeded.push(id);
                } catch {
                    result.failed.push(id);
                }
            }

            return result;
        },
        clearSynced: async () => {
            // .equals() does not support booleans - using a filter here instead
            // of updating the schema to 0/1s as the outbox is generally small
            // and it avoids the added complexity of having to update our schema entirely.
            await db.outbox.filter((entry) => entry.synced).delete();
        },
    };
};

export type OutboxStore = ReturnType<typeof createOutboxStore>;
