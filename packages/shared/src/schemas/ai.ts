import { z } from "zod";

export const VibeRequestSchema = z.object({
    mood: z.string().min(1),
    availableMinutes: z.number().positive(),
    preferredGameLength: z.enum(["short", "medium", "long", "any"]).optional(),
    preferredGenres: z.array(z.string().min(1)).optional(),
});
export type VibeRequest = z.infer<typeof VibeRequestSchema>;

export const RecommendationSchema = z.object({
    igdbId: z.number().int().positive(),
    title: z.string().min(1),
    reason: z.string().min(1),
    estimatedSessionMinutes: z.number().positive(),
    matchScore: z.number().int().min(0).max(100),
    reviewUrl: z.url().optional(),
    trailerUrl: z.url().optional(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const VibeResponseSchema = z.object({
    recommendations: z.array(RecommendationSchema),
    summary: z.string().min(1),
});
export type VibeResponse = z.infer<typeof VibeResponseSchema>;
