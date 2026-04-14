import { defineConfig } from 'vitest/config';
import { getTestDatabaseUrl } from './src/__tests__/integration/db-url.js';

export default defineConfig({
    test: {
        environment: 'node',
        fileParallelism: false,
        include: ['src/__tests__/integration/**/*.test.ts'],
        globalSetup: ['src/__tests__/integration/global-setup.ts'],
        env: {
            DATABASE_URL: getTestDatabaseUrl(),
            REDIS_URL: 'redis://localhost:6379',
            IGDB_CLIENT_ID: 'test-client-id',
            IGDB_CLIENT_SECRET: 'test-client-secret',
            SESSION_SECRET: 'test-session-secret-minimum-32-chars!!',
        },
    },
});
