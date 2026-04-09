import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('rate-limiter-flexible', () => ({
    RateLimiterRedis: class {
        consume = vi.fn().mockResolvedValue({});
    },
}));

vi.mock('../lib/redis.js', () => ({
    redis: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
    },
}));

vi.mock('../lib/db.js', () => ({
    prisma: {},
}));

vi.mock('../lib/auth.js', () => ({
    hashPassword: vi.fn().mockResolvedValue('$hashed$'),
    verifyPassword: vi.fn(),
}));

import { appRouter } from '../routers/index.js';
import { verifyPassword } from '../lib/auth.js';
import { Prisma } from '../generated/prisma/client';
import type { Context } from '../trpc/context.js';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_EMAIL = 'test@example.com';
const USER_DISPLAY_NAME = 'Test User';
const USER_PASSWORD = 'password123';

const mockDbUser = {
    id: USER_ID,
    email: USER_EMAIL,
    displayName: USER_DISPLAY_NAME,
    passwordHash: '$hashed$',
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockSessionUser = {
    id: USER_ID,
    email: USER_EMAIL,
    displayName: USER_DISPLAY_NAME,
};

// Returns mock objects separately so tests access them with MockedFunction types,
// not via the Context type (which would trigger @typescript-eslint/unbound-method).
function buildCtx(user?: typeof mockSessionUser) {
    const session = {
        get: vi.fn((key: string) => (key === 'user' ? user : undefined)),
        set: vi.fn(),
        destroy: vi.fn().mockResolvedValue(undefined),
    };
    const prisma = {
        user: {
            create: vi.fn(),
            findUnique: vi.fn(),
        },
    };
    const ctx = {
        prisma,
        redis: { get: vi.fn(), set: vi.fn() },
        req: { ip: '127.0.0.1' },
        session,
        user,
    } as unknown as Context;
    return { ctx, session, prisma };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('auth.register', () => {
    it('creates a user and sets session', async () => {
        const { ctx, session, prisma } = buildCtx();
        vi.mocked(prisma.user.create).mockResolvedValue(mockDbUser);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.auth.register({
            email: USER_EMAIL,
            password: USER_PASSWORD,
            displayName: USER_DISPLAY_NAME,
        });

        expect(result).toEqual(mockSessionUser);
        expect(session.set).toHaveBeenCalledWith('user', mockSessionUser);
    });

    it('throws CONFLICT on duplicate email', async () => {
        const { ctx, prisma } = buildCtx();
        const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '0.0.0',
        });
        vi.mocked(prisma.user.create).mockRejectedValue(prismaError);
        const caller = appRouter.createCaller(ctx);

        await expect(
            caller.auth.register({
                email: USER_EMAIL,
                password: USER_PASSWORD,
                displayName: USER_DISPLAY_NAME,
            }),
        ).rejects.toMatchObject({ code: 'CONFLICT' });
    });

    it('throws BAD_REQUEST when password is shorter than 8 characters', async () => {
        const { ctx } = buildCtx();
        const caller = appRouter.createCaller(ctx);

        await expect(
            caller.auth.register({
                email: USER_EMAIL,
                password: 'short',
                displayName: USER_DISPLAY_NAME,
            }),
        ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
});

describe('auth.login', () => {
    it('returns the user and sets session with valid credentials', async () => {
        const { ctx, session, prisma } = buildCtx();
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockDbUser);
        vi.mocked(verifyPassword).mockResolvedValue(true);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.auth.login({ email: USER_EMAIL, password: USER_PASSWORD });

        expect(result).toEqual(mockSessionUser);
        expect(session.set).toHaveBeenCalledWith('user', mockSessionUser);
    });

    it('throws UNAUTHORIZED with wrong password', async () => {
        const { ctx, prisma } = buildCtx();
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockDbUser);
        vi.mocked(verifyPassword).mockResolvedValue(false);
        const caller = appRouter.createCaller(ctx);

        await expect(
            caller.auth.login({ email: USER_EMAIL, password: 'wrongpassword' }),
        ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('throws UNAUTHORIZED when user does not exist', async () => {
        const { ctx, prisma } = buildCtx();
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
        const caller = appRouter.createCaller(ctx);

        await expect(
            caller.auth.login({ email: 'nobody@example.com', password: USER_PASSWORD }),
        ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
});

describe('auth.logout', () => {
    it('destroys the session for an authenticated user', async () => {
        const { ctx, session } = buildCtx(mockSessionUser);
        const caller = appRouter.createCaller(ctx);

        await caller.auth.logout();

        expect(session.destroy).toHaveBeenCalled();
    });

    it('throws UNAUTHORIZED when not logged in', async () => {
        const { ctx } = buildCtx();
        const caller = appRouter.createCaller(ctx);

        await expect(caller.auth.logout()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
});

describe('auth.me', () => {
    it('returns the current user when authenticated', async () => {
        const { ctx } = buildCtx(mockSessionUser);
        const caller = appRouter.createCaller(ctx);

        const result = await caller.auth.me();

        expect(result).toEqual(mockSessionUser);
    });

    it('returns undefined when not authenticated', async () => {
        const { ctx } = buildCtx();
        const caller = appRouter.createCaller(ctx);

        const result = await caller.auth.me();

        expect(result).toBeUndefined();
    });
});
