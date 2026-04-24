import { ReactNode } from 'react';
import useAuth from '../hooks/useAuth';
import { ROUTES } from '../lib/routes';
import { Navigate } from 'react-router-dom';
import { Spinner } from './ui/Spinner';

export default function AuthGuard({ children }: { children: ReactNode }) {
    const auth = useAuth();

    if (auth.isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return auth.isAuthenticated ? children : <Navigate to={ROUTES.LOGIN} replace />;
}
