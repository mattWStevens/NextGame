import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { trpc } from '../lib/trpc';
import { LoginSchema } from '@nextgame/shared';
import { Card, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

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

        if (validatedRequest.error) {
            const errorPaths = validatedRequest.error.issues.map((issue) => issue.path[0]);

            let firstErrorField: HTMLInputElement | null = null;

            if (errorPaths.includes('email')) {
                setEmailError(true);
                firstErrorField ??= emailRef.current;
            }
            if (errorPaths.includes('password')) {
                setPasswordError(true);
                firstErrorField ??= passwordRef.current;
            }

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

                <Card>
                    <CardBody className="p-6">
                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            <Input
                                ref={emailRef}
                                id="email"
                                label="Email address"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => {
                                    setEmailError(false);
                                    setEmail(e.target.value);
                                }}
                                placeholder="you@example.com"
                                error={emailError ? EMAIL_ERROR : undefined}
                            />

                            <Input
                                ref={passwordRef}
                                id="password"
                                label="Password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => {
                                    setPasswordError(false);
                                    setPassword(e.target.value);
                                }}
                                placeholder="••••••••"
                                error={passwordError ? PASSWORD_ERROR : undefined}
                            />

                            {error !== null && (
                                <p
                                    id="form-error"
                                    role="alert"
                                    className="rounded-lg border border-red-800 bg-red-950/50 px-3.5 py-2.5 text-sm text-red-400"
                                >
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                loading={loginMutation.isPending}
                                className="mt-2 w-full"
                            >
                                Sign in
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
