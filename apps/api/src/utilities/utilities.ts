import {
    BulkSyncResponse,
    CreateEntry,
    CreateGame,
    DeleteEntry,
    Game,
    IgdbGame,
    OutboxEntries,
    OutboxEntry,
    SyncOperations,
    UpdateEntry,
} from '@nextgame/shared';
import { Status } from '../generated/prisma/enums';
import { Prisma, PrismaClient, Game as PrismaGame } from '../generated/prisma/client';

const INSERT_SPARSE_STATUS_ORDER = 1000;
const STATUS_ORDER_EMPTY_BACKLOG_SEED = -1000;

export const prismaGameToGame = (game: PrismaGame): Game => ({
    id: game.id,
    userId: game.userId,
    igdbId: game.igdbId,
    title: game.title,
    slug: game.slug,
    status: game.status,
    statusOrder: game.statusOrder,
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
    clientId: game.clientId ?? undefined,
    coverUrl: game.coverUrl ?? undefined,
    summary: game.summary ?? undefined,
    genres: game.genres.length > 0 ? game.genres : undefined,
    platforms: game.platforms.length > 0 ? game.platforms : undefined,
    releaseDate: game.releaseDate?.toISOString(),
    rating: game.rating ?? undefined,
    review: game.review ?? undefined,
});

export const createNewGameEntry = (
    input: IgdbGame,
    userId: string,
    statusOrder: number,
): CreateGame => {
    // NOTE: treats epoch (0) as "no date". If IGDB ever returns first_release_date: 0 for a real game, it would
    // be silently dropped.
    const coverUrl = input.cover?.url ? `https:${input.cover.url}` : undefined;
    const releaseDateMs = (input.first_release_date ?? 0) * 1000;
    const releaseDate = releaseDateMs ? new Date(releaseDateMs) : undefined;
    const releaseDateISO = releaseDate ? releaseDate.toISOString() : undefined;

    const gameToAdd: CreateGame = {
        userId,
        statusOrder,
        igdbId: input.id,
        title: input.name,
        slug: input.slug,
        coverUrl: coverUrl,
        summary: input.summary,
        genres: input.genres?.map((item) => item.name),
        platforms: input.platforms?.map((item) => item.name),
        releaseDate: releaseDateISO,
        status: Status.backlog,
    };

    return gameToAdd;
};

export const getNewBacklogStatusOrder = async (
    prismaClient: PrismaClient | Prisma.TransactionClient,
    userId: string,
): Promise<number> => {
    const max = await prismaClient.game.aggregate({
        where: { userId, status: Status.backlog },
        _max: { statusOrder: true },
    });

    return (max._max.statusOrder ?? STATUS_ORDER_EMPTY_BACKLOG_SEED) + INSERT_SPARSE_STATUS_ORDER;
};

const handleUpdateEntry = async (
    entry: UpdateEntry,
    tx: Prisma.TransactionClient,
    userId: string,
    bulkSyncResponse: BulkSyncResponse,
): Promise<BulkSyncResponse> => {
    const result = { ...bulkSyncResponse };

    try {
        const currDBEntry = await tx.game.findFirst({ where: { id: entry.entityId, userId } });

        if (currDBEntry === null) {
            result.skipped.push(entry.entityId);
            return result;
        }

        const currDBTime = new Date(currDBEntry.updatedAt).getTime();
        const entryTime = new Date(entry.clientUpdatedAt).getTime();

        // LLW - user's outbox is newer than what is
        // currently stored in the DB.
        if (entryTime > currDBTime) {
            const { id: _id, ...updatedFields } = entry.payload;

            await tx.game.update({
                where: { id: entry.entityId, userId },
                data: updatedFields,
            });

            result.applied.push(entry.entityId);
        } else {
            result.rejected.push(prismaGameToGame(currDBEntry));
        }
    } catch (error) {
        console.error(error);
        result.skipped.push(entry.entityId);
    }

    return result;
};
const handleCreateEntry = async (
    entry: CreateEntry,
    tx: Prisma.TransactionClient,
    userId: string,
    bulkSyncResponse: BulkSyncResponse,
): Promise<BulkSyncResponse> => {
    const result = { ...bulkSyncResponse };

    try {
        const statusOrder = await getNewBacklogStatusOrder(tx, userId);
        const gameToAdd = createNewGameEntry(entry.payload, userId, statusOrder);

        await tx.game.upsert({
            where: { userId_igdbId: { userId, igdbId: entry.payload.id } },
            update: { clientId: entry.entityId },
            create: { clientId: entry.entityId, ...gameToAdd },
        });

        result.applied.push(entry.entityId);
    } catch (error) {
        console.error(error);
        result.skipped.push(entry.entityId);
    }

    return result;
};
const handleDeleteEntry = async (
    entry: DeleteEntry,
    tx: Prisma.TransactionClient,
    userId: string,
    bulkSyncResponse: BulkSyncResponse,
): Promise<BulkSyncResponse> => {
    const result = { ...bulkSyncResponse };

    try {
        await tx.game.delete({ where: { id: entry.entityId, userId } });
        result.applied.push(entry.entityId);
    } catch (error) {
        console.error(error);
        result.skipped.push(entry.entityId);
    }

    return result;
};

const handleBulkSyncEntry = async (
    entry: OutboxEntry,
    tx: Prisma.TransactionClient,
    userId: string,
    bulkSyncResponse: BulkSyncResponse,
): Promise<BulkSyncResponse> => {
    if (entry.operation === SyncOperations.update) {
        return await handleUpdateEntry(entry, tx, userId, bulkSyncResponse);
    } else if (entry.operation === SyncOperations.create) {
        return await handleCreateEntry(entry, tx, userId, bulkSyncResponse);
    } else {
        return await handleDeleteEntry(entry, tx, userId, bulkSyncResponse);
    }
};

export const handleBulkSyncOperations = async (
    input: OutboxEntries,
    tx: Prisma.TransactionClient,
    userId: string,
): Promise<BulkSyncResponse> => {
    let bulkSyncResponse: BulkSyncResponse = {
        applied: [],
        rejected: [],
        skipped: [],
    };

    for (const entry of input) {
        bulkSyncResponse = await handleBulkSyncEntry(entry, tx, userId, bulkSyncResponse);
    }

    return bulkSyncResponse;
};
