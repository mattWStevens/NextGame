import { createClient, type RedisClientType } from 'redis';
import { env } from './env';

export const redis: RedisClientType = createClient({
    url: env.REDIS_URL,
});

redis.on('error', (err) => {
    console.log('Redis Client Error', err);
});

await redis.connect();
