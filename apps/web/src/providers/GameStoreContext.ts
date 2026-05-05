import { createContext } from 'react';
import type { GameStore } from '../lib/game-store';
import type { OutboxStore } from '../lib/outbox';

export const GameStoreContext = createContext<{ games: GameStore; outbox: OutboxStore } | null>(
    null,
);
