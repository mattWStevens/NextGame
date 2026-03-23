import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { redis, prisma } from '../lib';
import { RedisClientType } from 'redis';
import { PrismaClient } from '../generated/prisma/client';
import type { Session, FastifyRequest } from 'fastify';

declare module 'fastify' {
    interface Session {
        user?: { id: string; email: string; displayName: string };
    }
}

export function createContext({ req }: CreateFastifyContextOptions): {
    redis: RedisClientType;
    prisma: PrismaClient;
    req: FastifyRequest;
    session: FastifyRequest['session'];
    user?: Session['user'];
} {
    return {
        redis,
        prisma,
        req,
        session: req.session,
        user: req.session.get('user'),
    };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
