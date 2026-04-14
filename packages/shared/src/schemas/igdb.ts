import { z } from 'zod';

const IgdbCoverSchema = z.object({
    id: z.number().int().positive(),
    image_id: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
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
    slug: z.string().min(1).optional(),
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

export const IgdbAccessTokenResponseSchema = z.object({
    access_token: z.string().min(1),
    expires_in: z.number(),
    token_type: z.string().min(1),
});

export const IgdbSearchSchema = z.object({
    query: z.string().min(1),
    limit: z.number().int().min(1).optional(),
});

export const IgdbGetByIdSchema = z.object({
    igdbId: z.number().int().positive(),
});
