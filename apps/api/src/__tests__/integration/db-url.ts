import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

/** Reads DATABASE_URL from process.env (CI) or the repo-root .env file (local dev). */
function getBaseDatabaseUrl(): string {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

    try {
        const envContent = readFileSync(resolve(REPO_ROOT, '.env'), 'utf-8');
        for (const line of envContent.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('DATABASE_URL=')) {
                return trimmed.slice('DATABASE_URL='.length);
            }
        }
    } catch {
        // .env not present — fall through to default
    }

    return 'postgresql://postgres:postgres@localhost:5432/nextgame';
}

/** Derives a test-safe DATABASE_URL by swapping the database name to nextgame_test. */
export function getTestDatabaseUrl(): string {
    const url = new URL(getBaseDatabaseUrl());
    url.pathname = '/nextgame_test';
    return url.toString();
}
