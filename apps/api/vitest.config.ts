import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        passWithNoTests: true,
        env: {
            DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nextgame_test',
            REDIS_URL: 'redis://localhost:6379',
            IGDB_CLIENT_ID: 'test-client-id',
            IGDB_CLIENT_SECRET: 'test-client-secret',
            SESSION_SECRET: 'test-session-secret-minimum-32-chars!!',
        },
    },
});
