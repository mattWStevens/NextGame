import { z } from 'zod';
import { IgdbGameSchema } from './igdb';
import { GameSchema, GameUpdateSchema } from './game';

export const SyncOperations = {
    create: 'create',
    update: 'update',
    delete: 'delete',
} as const;

const EntrySchema = z.object({
    id: z.uuid(),
    entityId: z.uuid(),
    synced: z.boolean(),
    createdAt: z.iso.datetime(),
    clientUpdatedAt: z.iso.datetime(),
});

const CreateEntrySchema = EntrySchema.extend({
    operation: z.literal(SyncOperations.create),
    payload: IgdbGameSchema,
});
export type CreateEntry = z.infer<typeof CreateEntrySchema>;
const UpdateEntrySchema = EntrySchema.extend({
    operation: z.literal(SyncOperations.update),
    payload: GameUpdateSchema,
});
export type UpdateEntry = z.infer<typeof UpdateEntrySchema>;
const DeleteEntrySchema = EntrySchema.extend({
    operation: z.literal(SyncOperations.delete),
});
export type DeleteEntry = z.infer<typeof DeleteEntrySchema>;

const _BulkSyncResponseSchema = z.object({
    applied: z.array(z.string()),
    rejected: z.array(GameSchema),
    skipped: z.array(z.string()),
});
export type BulkSyncResponse = z.infer<typeof _BulkSyncResponseSchema>;

export const OutboxEntrySchema = z.discriminatedUnion('operation', [
    CreateEntrySchema,
    UpdateEntrySchema,
    DeleteEntrySchema,
]);
export type OutboxEntry = z.infer<typeof OutboxEntrySchema>;

export const OutboxEntriesSchema = z.array(OutboxEntrySchema);
export type OutboxEntries = z.infer<typeof OutboxEntriesSchema>;
