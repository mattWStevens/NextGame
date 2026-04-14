import Fastify from 'fastify';
import { env } from './lib/env';
import { APP_NAME } from '@nextgame/shared';
import { RedisStore } from '@fastify-extra/connect-redis';
import fastifySession from '@fastify/session';
import { redis } from './lib/redis';
import fastifyCookie from '@fastify/cookie';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { TRPCError } from '@trpc/server';
import { appRouter } from './routers';
import { createContext } from './trpc/context';

export const server = Fastify({ logger: true });
const redisStore = new RedisStore({ client: redis });

server.register(fastifyCookie);

server.register(fastifySession, {
    secret: env.SESSION_SECRET,
    store: redisStore,
    cookie: {
        secure: env.NODE_ENV === 'production' ? true : 'auto',
        httpOnly: true,
        sameSite: 'lax',
    },
});

server.register(fastifyTRPCPlugin, {
    prefix: '/api/trpc',
    trpcOptions: {
        router: appRouter,
        createContext,
        onError: ({ path, error }: { path: string | undefined; error: TRPCError }) => {
            console.error({ path }, error);
        },
    },
});

server.get('/api/health', () => {
    return { status: 'ok', app: APP_NAME };
});

const start = async () => {
    try {
        const port = env.API_PORT;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 ${APP_NAME} API running on http://localhost:${String(port)}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

void start();
