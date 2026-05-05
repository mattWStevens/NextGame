import { useContext } from 'react';
import { GameStoreContext } from '../providers/GameStoreContext';

export function useGameStore() {
    const store = useContext(GameStoreContext);
    if (!store) throw new Error('useGameStore must be used within a GameStoreProvider');
    return store;
}
