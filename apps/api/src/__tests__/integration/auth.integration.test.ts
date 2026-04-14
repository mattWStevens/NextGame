import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma, redis, cleanDatabase, createTestCaller } from './helpers.js';

describe('auth (integration)', () => {
    beforeEach(async () => {
        await cleanDatabase();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await redis.quit();
    });

    it('register creates a user in the database', async () => {
        const caller = createTestCaller();

        const result = await caller.auth.register({
            email: 'test@example.com',
            displayName: 'Test User',
            password: 'password123',
        });

        expect(result.email).toBe('test@example.com');
        expect(result.displayName).toBe('Test User');
        expect(result.id).toBeDefined();

        const dbUser = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
        expect(dbUser).not.toBeNull();
        // Password must be stored hashed, not plaintext
        expect(dbUser?.passwordHash).not.toBe('password123');
    });

    it('register rejects a duplicate email', async () => {
        const input = { email: 'dupe@example.com', displayName: 'First', password: 'password123' };
        await createTestCaller().auth.register(input);
        await expect(createTestCaller().auth.register({ ...input, displayName: 'Second' })).rejects.toThrow();
    });

    it('login returns the session user for valid credentials', async () => {
        await createTestCaller().auth.register({
            email: 'login@example.com',
            displayName: 'Login User',
            password: 'securepass1',
        });

        const result = await createTestCaller().auth.login({
            email: 'login@example.com',
            password: 'securepass1',
        });

        expect(result.email).toBe('login@example.com');
        expect(result.id).toBeDefined();
    });

    it('login throws UNAUTHORIZED for wrong password', async () => {
        await createTestCaller().auth.register({
            email: 'secure@example.com',
            displayName: 'Secure User',
            password: 'correct-password',
        });

        await expect(
            createTestCaller().auth.login({
                email: 'secure@example.com',
                password: 'wrong-password',
            }),
        ).rejects.toThrow();
    });

    it('login throws UNAUTHORIZED for unknown email', async () => {
        await expect(
            createTestCaller().auth.login({ email: 'nobody@example.com', password: 'anything' }),
        ).rejects.toThrow();
    });

    it('me returns undefined when unauthenticated', async () => {
        const result = await createTestCaller().auth.me();
        expect(result).toBeUndefined();
    });

    it('me returns the session user when authenticated', async () => {
        const registered = await createTestCaller().auth.register({
            email: 'me@example.com',
            displayName: 'Me User',
            password: 'password123',
        });

        const result = await createTestCaller(registered).auth.me();
        expect(result?.id).toBe(registered.id);
    });
});
