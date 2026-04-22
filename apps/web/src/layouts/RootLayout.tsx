import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { NAV_LINKS, ROUTES } from '../lib/routes';
import { trpc } from '../lib/trpc';

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <>
            {NAV_LINKS.map(({ to, label, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                        [
                            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                                ? 'bg-gray-700 text-white'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                        ].join(' ')
                    }
                >
                    {label}
                </NavLink>
            ))}
        </>
    );
}

export default function RootLayout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const utils = trpc.useUtils();
    const navigate = useNavigate();
    const logoutMutation = trpc.auth.logout.useMutation({
        onError: (error) => {
            console.error(error); // TODO: Replace with Toast/Alert once component is added.
        },
        onSuccess: () => {
            void utils.auth.me.reset();
            void navigate(ROUTES.LOGIN);
        },
    });

    const handleSignOut = () => {
        setMenuOpen(false);
        logoutMutation.mutate();
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <header className="border-b border-gray-800 bg-gray-900">
                {/* Desktop nav */}
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-6">
                        <span className="text-lg font-bold tracking-tight">NextGame</span>
                        <nav className="hidden items-center gap-1 md:flex">
                            <NavItems />
                        </nav>
                    </div>
                    <div className="hidden items-center gap-3 md:flex">
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                        >
                            Sign out
                        </button>
                    </div>

                    {/* Hamburger button — mobile only */}
                    <button
                        type="button"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        onClick={() => {
                            setMenuOpen((prev) => !prev);
                        }}
                        className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white md:hidden"
                    >
                        {menuOpen ? (
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Mobile dropdown */}
                {menuOpen && (
                    <div className="border-t border-gray-800 px-4 pb-3 pt-2 md:hidden">
                        <nav className="flex flex-col gap-1">
                            <NavItems
                                onNavigate={() => {
                                    setMenuOpen(false);
                                }}
                            />
                        </nav>
                        <div className="mt-3 border-t border-gray-800 pt-3">
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                )}
            </header>

            <main className="mx-auto max-w-7xl">
                <Outlet />
            </main>
        </div>
    );
}
