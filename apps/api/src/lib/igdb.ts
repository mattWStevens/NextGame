import {
    IgdbAccessTokenResponseSchema,
    IgdbGame,
    IgdbGameSchema,
    IgdbSearchResultSchema,
} from '@nextgame/shared';
import { redis } from './redis';

const ACCESS_TOKEN_CACHE_KEY = 'igdb:access-token';
const IGDB_SEARCH_CACHE_PREFIX = 'igdb:search:';
const IGDB_GAME_CACHE_PREFIX = 'igdb:game:';
const CLIENT_ID_KEY = 'client_id';
const CLIENT_SECRET_KEY = 'client_secret';
const GRANT_TYPE_KEY = 'grant_type';
const GRANT_TYPE_VALUE = 'client_credentials';
const TTL = 3600; // seconds
const TTL_SAFETY_MARGIN = 60; // seconds
const CACHE_KEY_MAX_LENGTH = 200;
const DEFAULT_LIMIT = '10';
const GAME_FIELDS =
    'id,name,summary,slug,first_release_date,rating,cover.url,genres.name,platforms.name';
const DEFAULT_IMG_SIZE = 't_thumb';
const LARGER_IMG_SIZE = 't_cover_big';

const makeGameImgLarger = (game: IgdbGame) => {
    const updatedGame = { ...game };

    // Setting larger image size than the small default
    if (game.cover?.url) {
        updatedGame.cover = {
            ...game.cover,
            url: game.cover.url.replace(DEFAULT_IMG_SIZE, LARGER_IMG_SIZE),
        };
    }

    return updatedGame;
};

const getAccessToken = async () => {
    const cachedAccessToken = await redis.get(ACCESS_TOKEN_CACHE_KEY).catch((error: unknown) => {
        console.error(`Error retrieving access token from cache: ${ACCESS_TOKEN_CACHE_KEY}`, error);
    });

    if (!cachedAccessToken) {
        const requestParams = new URLSearchParams();
        requestParams.append(CLIENT_ID_KEY, process.env.IGDB_CLIENT_ID ?? '');
        requestParams.append(CLIENT_SECRET_KEY, process.env.IGDB_CLIENT_SECRET ?? '');
        requestParams.append(GRANT_TYPE_KEY, GRANT_TYPE_VALUE);

        const response = await fetch(process.env.IGDB_TOKEN_ENDPOINT ?? '', {
            method: 'POST',
            headers: {
                'Content-type': 'application/x-www-form-urlencoded',
            },
            body: requestParams,
        });

        if (!response.ok) {
            throw new Error(`Error fetching access token from twitch: ${response.statusText}`);
        }

        const tokenInfo = IgdbAccessTokenResponseSchema.parse(await response.json());

        try {
            await redis.set(ACCESS_TOKEN_CACHE_KEY, tokenInfo.access_token, {
                EX: Math.max(tokenInfo.expires_in - TTL_SAFETY_MARGIN, 1),
            });
        } catch (error) {
            console.error('Error caching access token', error);
        }

        return tokenInfo.access_token;
    }

    return cachedAccessToken;
};

export const getGameById = async (igdbId: number): Promise<IgdbGame | undefined> => {
    const idString = igdbId.toString();
    const cacheKey = `${IGDB_GAME_CACHE_PREFIX}${idString}`;
    const cachedGame = await redis.get(cacheKey).catch((error: unknown) => {
        console.error(`Error getting game from cache: ${cacheKey}`, error);
    });

    if (!cachedGame) {
        const accessToken = await getAccessToken();

        const response = await fetch(process.env.IGDB_GAMES_ENDPOINT ?? '', {
            method: 'POST',
            headers: {
                'Client-ID': process.env.IGDB_CLIENT_ID ?? '',
                Authorization: `Bearer ${accessToken}`,
            },
            body: `fields ${GAME_FIELDS}; where id = ${idString};`,
        });

        if (!response.ok) {
            throw new Error(
                `Error searching for game with ID of ${idString} via IGDB API: ${response.statusText}`,
            );
        }

        const result = IgdbSearchResultSchema.parse(await response.json()).map((game) =>
            makeGameImgLarger(game),
        );

        if (result.length > 0) {
            try {
                await redis.set(cacheKey, JSON.stringify(result[0]), {
                    EX: TTL,
                });
            } catch (error) {
                console.error(`Error setting cache: ${cacheKey}`, error);
            }
        }

        return result[0];
    }

    const parsedCachedValue = IgdbGameSchema.parse(JSON.parse(cachedGame));

    return parsedCachedValue;
};

export const searchGames = async (query: string, limit?: number) => {
    const normalizedQuery = query.replace(/"/g, '\\"').trim();
    const cappedNormalizedQuery = normalizedQuery.slice(0, CACHE_KEY_MAX_LENGTH);
    const cacheKey = `${IGDB_SEARCH_CACHE_PREFIX}${cappedNormalizedQuery}:${limit?.toString() ?? DEFAULT_LIMIT}`;
    const cachedResult = await redis.get(cacheKey).catch((error: unknown) => {
        console.error(`Error getting games from cache: ${cacheKey}`, error);
    });

    if (!cachedResult) {
        const accessToken = await getAccessToken();

        const limitValue = limit !== undefined ? limit.toString() : DEFAULT_LIMIT;
        const body = `search "${normalizedQuery}"; fields ${GAME_FIELDS}; limit ${limitValue};`;

        const response = await fetch(process.env.IGDB_GAMES_ENDPOINT ?? '', {
            method: 'POST',
            headers: {
                'Client-ID': process.env.IGDB_CLIENT_ID ?? '',
                Authorization: `Bearer ${accessToken}`,
            },
            body,
        });

        if (!response.ok) {
            throw new Error(`Error searching for games with IGDB API: ${response.statusText}`);
        }

        const result = IgdbSearchResultSchema.parse(await response.json()).map((game) =>
            makeGameImgLarger(game),
        );

        try {
            await redis.set(cacheKey, JSON.stringify(result), {
                EX: TTL,
            });
        } catch (error) {
            console.error(`Error setting cache: ${cacheKey}`, error);
        }

        return result;
    }

    const parsedCacheValue = IgdbSearchResultSchema.parse(JSON.parse(cachedResult));

    return parsedCacheValue;
};
