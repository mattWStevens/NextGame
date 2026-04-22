import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { trpc } from '../lib/trpc';
import { LoginSchema } from '@nextgame/shared';

const EMAIL_ERROR = 'Please enter a valid email address.';
const PASSWORD_ERROR = 'Password field must not be empty.';
const ERROR_MSG = 'Incorrect login information.';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const utils = trpc.useUtils();
    const loginMutation = trpc.auth.login.useMutation({
        onError: () => {
            setError(ERROR_MSG);
        },
        onSuccess: (data) => {
            utils.auth.me.setData(undefined, data);
            void navigate(ROUTES.BOARD);
        },
    });

    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const request = {
            email,
            password,
        };

        const validatedRequest = LoginSchema.safeParse(request);

        let errorMsg = '';
        let firstErrorField: HTMLInputElement | null = null;

        if (validatedRequest.error) {
            const errorPaths = validatedRequest.error.issues.map((issue) => issue.path[0]);

            if (errorPaths.includes('email')) {
                setEmailError(true);
                errorMsg += `${EMAIL_ERROR} `;
                firstErrorField ??= emailRef.current;
            }
            if (errorPaths.includes('password')) {
                setPasswordError(true);
                errorMsg += `${PASSWORD_ERROR} `;
                firstErrorField ??= passwordRef.current;
            }

            setError(errorMsg.trim() || null);
            firstErrorField?.focus();
            return;
        }

        loginMutation.mutate(validatedRequest.data);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <span className="text-2xl font-bold tracking-tight text-white">NextGame</span>
                    <h1 className="mt-4 text-xl font-semibold text-white">
                        Sign in to your account
                    </h1>
                    <p className="mt-1 text-sm text-gray-400">
                        Don&apos;t have an account?{' '}
                        <Link
                            to={ROUTES.REGISTER}
                            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                        >
                            Create one
                        </Link>
                    </p>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-sm font-medium text-gray-300"
                            >
                                Email address
                            </label>
                            <input
                                ref={emailRef}
                                id="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => {
                                    setEmailError(false);
                                    setEmail(e.target.value);
                                }}
                                aria-invalid={emailError}
                                placeholder="you@example.com"
                                className={`w-full rounded-lg ${!emailError ? 'border border-gray-700 bg-gray-800' : 'border-2 border-red-800 bg-red-950/50'} px-3.5 py-2.5 text-sm ${!emailError ? 'text-white' : 'text-red-400'} placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30`}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-sm font-medium text-gray-300"
                            >
                                Password
                            </label>
                            <input
                                ref={passwordRef}
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => {
                                    setPasswordError(false);
                                    setPassword(e.target.value);
                                }}
                                aria-invalid={passwordError}
                                placeholder="••••••••"
                                className={`w-full rounded-lg ${!passwordError ? 'border border-gray-700 bg-gray-800' : 'border-2 border-red-800 bg-red-950/50'} px-3.5 py-2.5 text-sm ${!passwordError ? 'text-white' : 'text-red-400'} placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30`}
                            />
                        </div>

                        {error !== null && (
                            <p
                                id="form-error"
                                role="alert"
                                className="rounded-lg border border-red-800 bg-red-950/50 px-3.5 py-2.5 text-sm text-red-400"
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loginMutation.isPending}
                            aria-busy={loginMutation.isPending}
                            className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
