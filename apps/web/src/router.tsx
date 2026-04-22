import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import BoardPage from './pages/BoardPage';
import SearchPage from './pages/SearchPage';
import VibePage from './pages/VibePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { ROUTES } from './lib/routes';
import AuthGuard from './components/AuthGuard';
import PublicOnlyGuard from './components/PublicOnlyGuard';

const router = createBrowserRouter([
    {
        path: ROUTES.BOARD,
        element: (
            <AuthGuard>
                <RootLayout />
            </AuthGuard>
        ),
        children: [
            { index: true, element: <BoardPage /> },
            { path: ROUTES.SEARCH, element: <SearchPage /> },
            { path: ROUTES.VIBE, element: <VibePage /> },
        ],
    },
    {
        path: ROUTES.LOGIN,
        element: (
            <PublicOnlyGuard>
                <LoginPage />
            </PublicOnlyGuard>
        ),
    },
    {
        path: ROUTES.REGISTER,
        element: (
            <PublicOnlyGuard>
                <RegisterPage />
            </PublicOnlyGuard>
        ),
    },
]);

export default router;
