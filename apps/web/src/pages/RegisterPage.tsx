import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { RegisterSchema } from '@nextgame/shared';
import { trpc } from '../lib/trpc';

const NAME_ERROR = 'Display name cannot be blank.';
const EMAIL_ERROR = 'Email address must be a valid email.';
const PASSWORD_ERROR = 'Password must be at least 8 characters.';
const REGISTER_ERROR = 'There was a problem registering. Please try again.';

export default function RegisterPage() {
    const [displayName, setDisplayName] = useState('');
    const [nameError, setNameError] = useState(false);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const utils = trpc.useUtils();
    const registerMutation = trpc.auth.register.useMutation({
        onError: () => {
            setError(REGISTER_ERROR);
        },
        onSuccess: (data) => {
            utils.auth.me.setData(undefined, data);
            void navigate(ROUTES.BOARD);
        },
    });

    const displayNameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const request = {
            displayName,
            email,
            password,
        };

        const validatedRequest = RegisterSchema.safeParse(request);

        if (validatedRequest.error) {
            const errorPaths = validatedRequest.error.issues.map((issue) => issue.path[0]);

            let errorMsg = '';
            let firstErrorField: HTMLInputElement | null = null;

            if (errorPaths.includes('displayName')) {
                setNameError(true);
                errorMsg += `${NAME_ERROR} `;
                firstErrorField ??= displayNameRef.current;
            }
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

        registerMutation.mutate(validatedRequest.data);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <span className="text-2xl font-bold tracking-tight text-white">NextGame</span>
                    <h1 className="mt-4 text-xl font-semibold text-white">Create your account</h1>
                    <p className="mt-1 text-sm text-gray-400">
                        Already have an account?{' '}
                        <Link
                            to={ROUTES.LOGIN}
                            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        <div>
                            <label
                                htmlFor="displayName"
                                className="mb-1.5 block text-sm font-medium text-gray-300"
                            >
                                Display name
                            </label>
                            <input
                                ref={displayNameRef}
                                id="displayName"
                                type="text"
                                autoComplete="nickname"
                                required
                                aria-invalid={nameError}
                                value={displayName}
                                onBlur={() => {
                                    if (
                                        !RegisterSchema.shape.displayName.safeParse(displayName)
                                            .success
                                    ) {
                                        setNameError(true);
                                    }
                                }}
                                onChange={(e) => {
                                    setNameError(false);
                                    setDisplayName(e.target.value);
                                }}
                                placeholder="Your name"
                                className={`w-full rounded-lg ${!nameError ? 'border border-gray-700 bg-gray-800' : 'border-2 border-red-800 bg-red-950/50'} px-3.5 py-2.5 text-sm ${!nameError ? 'text-white' : 'text-red-400'} placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30`}
                            />
                        </div>

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
                                aria-invalid={emailError}
                                value={email}
                                onBlur={() => {
                                    if (
                                        email &&
                                        !RegisterSchema.shape.email.safeParse(email).success
                                    ) {
                                        setEmailError(true);
                                    }
                                }}
                                onChange={(e) => {
                                    setEmailError(false);
                                    setEmail(e.target.value);
                                }}
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
                                autoComplete="new-password"
                                required
                                minLength={8}
                                aria-invalid={passwordError}
                                value={password}
                                onBlur={() => {
                                    if (
                                        password &&
                                        !RegisterSchema.shape.password.safeParse(password).success
                                    ) {
                                        setPasswordError(true);
                                    }
                                }}
                                onChange={(e) => {
                                    setPasswordError(false);
                                    setPassword(e.target.value);
                                }}
                                placeholder="Min. 8 characters"
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
                            disabled={registerMutation.isPending}
                            aria-busy={registerMutation.isPending}
                            className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {registerMutation.isPending ? 'Creating account…' : 'Create account'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
