import { ReactNode, useMemo } from 'react';
import useAuth from '../hooks/useAuth';
import { createGameStore } from '../lib/game-store';
import { GameStoreContext } from './GameStoreContext';
import { createOutboxStore } from '../lib/outbox';

export function GameStoreProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const userId = user?.id ?? null;

    const store = useMemo(
        () =>
            userId
                ? {
                      games: createGameStore(userId),
                      outbox: createOutboxStore(userId),
                  }
                : null,
        [userId],
    );

    return <GameStoreContext.Provider value={store}>{children}</GameStoreContext.Provider>;
}
