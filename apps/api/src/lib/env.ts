import { z, ZodError } from 'zod';

const EnvSchema = z.object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    IGDB_CLIENT_ID: z.string().min(1),
    IGDB_CLIENT_SECRET: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    SESSION_SECRET: z.string().min(32),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});
export type Env = z.infer<typeof EnvSchema>;

export const env: Env = (() => {
    try {
        return EnvSchema.parse(process.env);
    } catch (error) {
        console.error(
            'Invalid environment — server will not start:',
            error instanceof ZodError ? z.treeifyError(error) : error,
        );
        process.exit(1);
    }
})();
