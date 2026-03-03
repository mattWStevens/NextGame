import { z } from "zod";

export const GameStatusSchema = z.enum(["backlog", "playing", "beaten"]);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const GameSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
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