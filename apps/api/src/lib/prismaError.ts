import { Prisma } from '../generated/prisma/client';
import { TRPCError } from '@trpc/server';
import {
    BAD_REQUEST_ERROR_CODE,
    CONFLICT_ERROR_CODE,
    NOT_FOUND_ERROR_CODE,
} from '../trpc/errorConstants';

const P2002 = 'P2002';
const P2025 = 'P2025';
const P2003 = 'P2003';

export function handlePrismaError(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === P2002) throw new TRPCError({ code: CONFLICT_ERROR_CODE });
        if (err.code === P2025) throw new TRPCError({ code: NOT_FOUND_ERROR_CODE });
        if (err.code === P2003) throw new TRPCError({ code: BAD_REQUEST_ERROR_CODE });
    }
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: err });
}
