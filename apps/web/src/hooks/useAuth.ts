import { trpc } from '../lib/trpc';

export default function useAuth() {
    const userQuery = trpc.auth.me.useQuery();

    return {
        user: userQuery.data ?? null,
        isAuthenticated: !userQuery.isPending && !!userQuery.data,
        isPending: userQuery.isPending,
        isNetworkError: userQuery.isError,
    };
}
