import { prisma } from '../../lib/db.js';
import { redis } from '../../lib/redis.js';
import { appRouter } from '../../routers/index.js';
import type { Session, FastifyRequest } from 'fastify';

export { prisma, redis };

export async function cleanDatabase() {
    await prisma.game.deleteMany();
    await prisma.user.deleteMany();
}

type SessionUser = NonNullable<Session['user']>;
type TestCaller = ReturnType<typeof appRouter.createCaller>;

let ipCounter = 0;

export function createTestCaller(sessionUser?: SessionUser): TestCaller {
    // Unique IP per caller so rate limiter state from one test doesn't affect another
    const segment1 = String(Math.floor(ipCounter / 254));
    const segment2 = String((ipCounter++ % 254) + 1);
    const ip = `10.0.${segment1}.${segment2}`;

    const sessionData = new Map<string, unknown>(sessionUser ? [['user', sessionUser]] : []);

    const session = {
        get: (key: string) => sessionData.get(key) as SessionUser | undefined,
        set: (key: string, value: unknown) => {
            sessionData.set(key, value);
        },
        destroy: () => {
            sessionData.clear();
        },
    };

    return appRouter.createCaller({
        prisma,
        redis,
        req: { ip, session } as unknown as FastifyRequest,
        session: session as unknown as FastifyRequest['session'],
        user: sessionUser,
    });
}
