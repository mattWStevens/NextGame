import { router } from '../trpc/trpc';
import { authRouter } from './auth';
import { gameRouter } from './game';
import { igdbRouter } from './igdb';

export const appRouter = router({
    auth: authRouter,
    game: gameRouter,
    igdb: igdbRouter,
});

export type AppRouter = typeof appRouter;
