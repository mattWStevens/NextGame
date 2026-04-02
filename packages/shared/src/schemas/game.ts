import { z } from 'zod';

const ZOD_CUSTOM_ERROR = 'custom';
const ZOD_CUSTOM_ERROR_MESSAGE = 'At least one optional field must be provided';

export const GameStatusSchema = z.enum(['backlog', 'playing', 'beaten']);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const GameSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
    clientId: z.uuid().optional(),
    igdbId: z.number().int().positive(),
    title: z.string().min(1),
    slug: z.string().min(1),
    coverUrl: z.url().optional(),
    summary: z.string().optional(),
    genres: z.array(z.string().min(1)).optional(),
    platforms: z.array(z.string().min(1)).optional(),
    releaseDate: z.iso.datetime().optional(),
    rating: z.number().min(1).max(5).optional(),
    review: z.string().optional(),
    status: GameStatusSchema,
    statusOrder: z.number().int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
});
export type Game = z.infer<typeof GameSchema>;

export const GameIdSchema = GameSchema.pick({ id: true });
export const GameReorderSchema = z.array(GameSchema.pick({ id: true, statusOrder: true }));

const GameUpdateSchemaBase = GameSchema.pick({
    id: true,
    status: true,
    statusOrder: true,
    rating: true,
    review: true,
});
export const GameUpdateSchema = GameUpdateSchemaBase.partial({
    status: true,
    statusOrder: true,
    rating: true,
    review: true,
}).superRefine((data, ctx) => {
    if (
        data.status === undefined &&
        data.statusOrder === undefined &&
        data.rating === undefined &&
        data.review === undefined
    ) {
        ctx.addIssue({
            code: ZOD_CUSTOM_ERROR,
            message: ZOD_CUSTOM_ERROR_MESSAGE,
        });
    }
});

const _CreateGameSchema = GameSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateGame = z.infer<typeof _CreateGameSchema>;

export type GameReorder = z.infer<typeof GameReorderSchema>[number];
