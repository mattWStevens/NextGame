import { initTRPC, TRPCError } from '@trpc/server';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Context } from './context';
import { redis } from '../lib';
import { LOGIN_PATH, REGISTER_PATH } from '../paths/paths';

const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = publicProcedure.use((opts) => {
    const { ctx } = opts;

    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    return opts.next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    });
});

const BLOCK_REQUEST_DURATION = 60;
const LOGIN_REQUESTS_PER_DURATION = 10;
const LOGIN_DURATION = 60; // seconds
const LOGIN_KEY_PREFIX = 'trpc_limiter_login';
const REGISTER_REQUESTS_PER_DURATION = 5;
const REGISTER_DURATION = 3600; // seconds
const REGISTER_KEY_PREFIX = 'trpc_limiter_register';

const rateLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'trpc_limiter',
    points: 10,
    duration: 1,
    blockDuration: 60,
    useRedisPackage: true,
});

const loginRateLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: LOGIN_KEY_PREFIX,
    points: LOGIN_REQUESTS_PER_DURATION,
    duration: LOGIN_DURATION,
    blockDuration: BLOCK_REQUEST_DURATION,
    useRedisPackage: true,
});

const registerRateLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: REGISTER_KEY_PREFIX,
    points: REGISTER_REQUESTS_PER_DURATION,
    duration: REGISTER_DURATION,
    blockDuration: BLOCK_REQUEST_DURATION,
    useRedisPackage: true,
});

const getRateLimiterByPath = (path: string): RateLimiterRedis => {
    return path === LOGIN_PATH
        ? loginRateLimiter
        : path === REGISTER_PATH
          ? registerRateLimiter
          : rateLimiter;
};

export const limiterMiddleware = t.middleware(async ({ ctx, path, next }) => {
    const key = ctx.req.ip;

    const limiter = getRateLimiterByPath(path);

    try {
        await limiter.consume(key);
    } catch {
        throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests',
        });
    }
    return next();
});
