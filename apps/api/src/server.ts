import Fastify from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { APP_NAME } from '@nextgame/shared';
import { RedisStore } from '@fastify-extra/connect-redis';
import fastifySession from '@fastify/session';
import { redis } from './lib/redis';
import fastifyCookie from '@fastify/cookie';

export const server = Fastify({ logger: true });
const redisStore = new RedisStore({ client: redis });

server.register(fastifyRateLimit, { global: false });
server.register(fastifyCookie);

server.register(fastifySession, {
    secret:
        process.env.SECURE_SESSION ??
        (() => {
            throw new Error('SECURE_SESSION is not set');
        })(),
    store: redisStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production' ? true : 'auto',
        httpOnly: true,
        sameSite: 'lax',
    },
});

server.post(
    '/login',
    {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
    },
    () => {
        // Login functionality to be implemented.
        console.log('login');
    },
);

server.post(
    '/register',
    {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '1 hour',
            },
        },
    },
    () => {
        // Register functionality to be implemented.
        console.log('register');
    },
);

server.get('/api/health', () => {
    return { status: 'ok', app: APP_NAME };
});

const start = async () => {
    try {
        const port = Number(process.env.API_PORT) || 3001;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`🚀 ${APP_NAME} API running on http://localhost:${String(port)}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

void start();
