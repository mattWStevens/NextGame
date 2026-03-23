import { Prisma } from '../generated/prisma/client';
import { TRPCError } from '@trpc/server';

export function handlePrismaError(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') throw new TRPCError({ code: 'CONFLICT' });
        if (err.code === 'P2025') throw new TRPCError({ code: 'NOT_FOUND' });
        if (err.code === 'P2003') throw new TRPCError({ code: 'BAD_REQUEST' });
    }
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: err });
}
