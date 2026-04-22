import { ReactNode } from 'react';
import useAuth from '../hooks/useAuth';
import { ROUTES } from '../lib/routes';
import { Navigate } from 'react-router-dom';

export default function PublicOnlyGuard({ children }: { children: ReactNode }) {
    const auth = useAuth();

    return auth.isPending ? null : auth.isAuthenticated ? (
        <Navigate to={ROUTES.BOARD} replace />
    ) : (
        children
    );
}
