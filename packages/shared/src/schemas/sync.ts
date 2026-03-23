import { z } from 'zod';

export const SyncOperationSchema = z.enum(['create', 'update', 'delete']);
export type SyncOperation = z.infer<typeof SyncOperationSchema>;

export const OutboxEntrySchema = z.object({
    id: z.uuid(),
    entityId: z.uuid(),
    operation: SyncOperationSchema,
    payload: z.record(z.string(), z.unknown()).optional(),
    synced: z.boolean(),
    createdAt: z.iso.datetime(),
});
export type OutboxEntry = z.infer<typeof OutboxEntrySchema>;
