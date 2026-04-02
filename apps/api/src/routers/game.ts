import { handlePrismaError } from '../lib/prismaError';
import { Prisma, Game as PrismaGame } from '../generated/prisma/client';
import { protectedProcedure, router } from '../trpc/trpc';
import {
    GameIdSchema,
    GameReorderSchema,
    GameUpdateSchema,
    IgdbGameSchema,
    OutboxEntriesSchema,
} from '@nextgame/shared';
import {
    createNewGameEntry,
    getNewBacklogStatusOrder,
    handleBulkSyncOperations,
    prismaGameToGame,
} from '../utilities/utilities';
import { TRPCError } from '@trpc/server';
import { NOT_FOUND_ERROR_CODE } from '../trpc/errorConstants';

export const gameRouter = router({
    list: protectedProcedure.query(async (options) => {
        const { ctx } = options;

        // Prisma's orderBy does not support CASE expressions, so raw SQL is required to sort
        // by status in the intended display order (backlog → playing → beaten), which differs
        // from the enum's alphabetical order.
        const games = await ctx.prisma
            .$queryRaw<PrismaGame[]>(
                Prisma.sql`                                                                                                                                                                                                    
SELECT *                                                                                                                                                                                                   
FROM "Game"
WHERE "userId" = ${ctx.user.id}::uuid                                                                                                                                                                      
ORDER BY
    CASE
        WHEN status = 'backlog' THEN 1
        WHEN status = 'playing' THEN 2
        WHEN status = 'beaten' THEN 3                                                                                                                                                                      
        ELSE 4
    END,                                                                                                                                                                                                   
    "statusOrder" ASC
    `,
            )
            .catch(handlePrismaError);

        return games.map((game) => prismaGameToGame(game));
    }),
    getById: protectedProcedure.input(GameIdSchema).query(async (options) => {
        const { input, ctx } = options;

        const game = await ctx.prisma.game
            .findFirst({
                where: {
                    userId: ctx.user.id,
                    id: input.id,
                },
            })
            .catch(handlePrismaError);

        if (!game) throw new TRPCError({ code: NOT_FOUND_ERROR_CODE });

        return prismaGameToGame(game);
    }),
    create: protectedProcedure.input(IgdbGameSchema).mutation(async (options) => {
        const { input, ctx } = options;

        const userId = ctx.user.id;

        const gameAdded = await ctx.prisma
            .$transaction(async (tx) => {
                const statusOrder = await getNewBacklogStatusOrder(tx, userId);
                const gameToAdd = createNewGameEntry(input, userId, statusOrder);
                return await tx.game.create({
                    data: gameToAdd,
                });
            })
            .catch(handlePrismaError);

        return prismaGameToGame(gameAdded);
    }),
    update: protectedProcedure.input(GameUpdateSchema).mutation(async (options) => {
        const { input, ctx } = options;

        const { id, ...updatedFields } = input;

        const updatedGame = await ctx.prisma.game
            .update({
                where: { id: id, userId: ctx.user.id },
                data: updatedFields,
            })
            .catch(handlePrismaError);

        return prismaGameToGame(updatedGame);
    }),
    delete: protectedProcedure.input(GameIdSchema).mutation(async (options) => {
        const { input, ctx } = options;

        const deletedGame = await ctx.prisma.game
            .delete({
                where: {
                    id: input.id,
                    userId: ctx.user.id,
                },
            })
            .catch(handlePrismaError);

        return prismaGameToGame(deletedGame);
    }),
    reorder: protectedProcedure.input(GameReorderSchema).mutation(async (options) => {
        const { input, ctx } = options;

        const prismaUpdateQueries = input.map((item) => {
            return ctx.prisma.game.update({
                where: { id: item.id, userId: ctx.user.id },
                data: { statusOrder: item.statusOrder },
            });
        });

        const updatedGameOrders = await ctx.prisma
            .$transaction(prismaUpdateQueries)
            .catch(handlePrismaError);

        return updatedGameOrders.map((game) => prismaGameToGame(game));
    }),
    bulkSync: protectedProcedure.input(OutboxEntriesSchema).mutation(async (options) => {
        const { input, ctx } = options;

        const result = await ctx.prisma.$transaction(async (tx) => {
            return await handleBulkSyncOperations(input, tx, ctx.user.id);
        });

        return result;
    }),
});
