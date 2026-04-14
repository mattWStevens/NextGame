import { IgdbGetByIdSchema, IgdbSearchSchema } from '@nextgame/shared';
import { protectedProcedure, router } from '../trpc/trpc';
import { getGameById, searchGames } from '../lib/igdb';
import { TRPCError } from '@trpc/server';
import { NOT_FOUND_ERROR_CODE } from '../trpc/errorConstants';

export const igdbRouter = router({
    search: protectedProcedure.input(IgdbSearchSchema).query(async (options) => {
        const { query, limit } = options.input;

        return await searchGames(query, limit);
    }),
    getById: protectedProcedure.input(IgdbGetByIdSchema).query(async (options) => {
        const game = await getGameById(options.input.igdbId);

        if (!game) throw new TRPCError({ code: NOT_FOUND_ERROR_CODE });

        return game;
    }),
});
