import { z } from "zod";

const IgdbCoverSchema = z.object({
    id: z.number().int().positive(),
    image_id: z.string().min(1),
    url: z.string().min(1),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
});

const IgdbGenreSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    slug: z.string().min(1).optional(),
});

const IgdbPlatformSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    slug: z.string().min(1).optional(),
    abbreviation: z.string().optional(),
});

export const IgdbGameSchema = z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    slug: z.string().min(1),
    cover: IgdbCoverSchema.optional(),
    summary: z.string().optional(),
    genres: z.array(IgdbGenreSchema).optional(),
    platforms: z.array(IgdbPlatformSchema).optional(),
    first_release_date: z.number().int().optional(),
    rating: z.number().min(0).max(100).optional(),
    url: z.string().optional(),
});
export type IgdbGame = z.infer<typeof IgdbGameSchema>;

export const IgdbSearchResultSchema = z.array(IgdbGameSchema);
export type IgdbSearchResult = z.infer<typeof IgdbSearchResultSchema>;
