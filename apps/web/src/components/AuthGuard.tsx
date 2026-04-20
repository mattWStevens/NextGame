import { ReactNode } from 'react';
import useAuth from '../hooks/useAuth';
import { ROUTES } from '../lib/routes';
import { Navigate } from 'react-router-dom';

export default function AuthGuard({ children }: { children: ReactNode }) {
    const auth = useAuth();

    return auth.isPending ? null : auth.isAuthenticated ? (
        children
    ) : (
        <Navigate to={ROUTES.LOGIN} replace />
    );
}
