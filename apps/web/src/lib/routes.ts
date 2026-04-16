export const ROUTES = {
    BOARD: '/',
    SEARCH: '/search',
    VIBE: '/vibe',
    LOGIN: '/login',
    REGISTER: '/register',
} as const;

export const NAV_LINKS: { to: string; label: string; end?: boolean }[] = [
    { to: ROUTES.BOARD, label: 'Board', end: true },
    { to: ROUTES.SEARCH, label: 'Search' },
    { to: ROUTES.VIBE, label: 'Vibe' },
];
