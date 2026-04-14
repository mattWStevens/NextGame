import { Client } from 'pg';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getTestDatabaseUrl } from './db-url.js';

const API_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export async function setup() {
    const testDatabaseUrl = getTestDatabaseUrl();

    const adminUrl = new URL(testDatabaseUrl);
    adminUrl.pathname = '/postgres';

    const adminClient = new Client({ connectionString: adminUrl.toString() });
    await adminClient.connect();
    const { rowCount } = await adminClient.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        ['nextgame_test'],
    );
    if (rowCount === 0) {
        await adminClient.query('CREATE DATABASE nextgame_test');
    }
    await adminClient.end();

    execSync('pnpm exec prisma migrate deploy', {
        cwd: API_ROOT,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    });
}
