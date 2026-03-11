import { createClient, type RedisClientType } from 'redis';

export const redis: RedisClientType = createClient({
    url: process.env.REDIS_URL
});

redis.on('error', (err) => { console.log('Redis Client Error', err) });

await redis.connect();