import { TRPCError } from '@trpc/server';
import { hashPassword, verifyPassword } from '../lib/auth';
import { router, publicProcedure, protectedProcedure, limiterMiddleware } from '../trpc/trpc';
import { RegisterSchema, LoginSchema } from '@nextgame/shared';
import { handlePrismaError } from '../lib/prismaError';
import { UNAUTHORIZED_ERROR_CODE } from '../trpc/errorConstants';

export const authRouter = router({
    register: publicProcedure
        .use(limiterMiddleware)
        .input(RegisterSchema)
        .mutation(async (options) => {
            const { input, ctx } = options;

            const hashedPassword = await hashPassword(input.password);

            const user = await ctx.prisma.user
                .create({
                    data: {
                        displayName: input.displayName,
                        passwordHash: hashedPassword,
                        email: input.email,
                    },
                })
                .catch(handlePrismaError);

            const sessionUser = {
                id: user.id,
                displayName: user.displayName,
                email: user.email,
            };

            ctx.session.set('user', sessionUser);

            return sessionUser;
        }),
    login: publicProcedure
        .use(limiterMiddleware)
        .input(LoginSchema)
        .mutation(async (options) => {
            const { input, ctx } = options;

            const user = await ctx.prisma.user
                .findUnique({ where: { email: input.email } })
                .catch(handlePrismaError);

            if (user) {
                const isValid = await verifyPassword(input.password, user.passwordHash);

                if (isValid) {
                    const sessionUser = {
                        id: user.id,
                        displayName: user.displayName,
                        email: user.email,
                    };

                    ctx.session.set('user', sessionUser);

                    return sessionUser;
                } else {
                    throw new TRPCError({ code: UNAUTHORIZED_ERROR_CODE });
                }
            } else {
                throw new TRPCError({ code: UNAUTHORIZED_ERROR_CODE });
            }
        }),
    logout: protectedProcedure.mutation(async (options) => {
        await options.ctx.session.destroy();
    }),
    me: publicProcedure.query((options) => {
        return options.ctx.user;
    }),
});
