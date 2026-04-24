import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../lib/routes';
import { RegisterSchema } from '@nextgame/shared';
import { trpc } from '../lib/trpc';
import { Card, CardBody } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

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

            let firstErrorField: HTMLInputElement | null = null;

            if (errorPaths.includes('displayName')) {
                setNameError(true);
                firstErrorField ??= displayNameRef.current;
            }
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

                <Card>
                    <CardBody className="p-6">
                        <form onSubmit={handleSubmit} noValidate className="space-y-4">
                            <Input
                                ref={displayNameRef}
                                id="displayName"
                                label="Display name"
                                type="text"
                                autoComplete="nickname"
                                required
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
                                error={nameError ? NAME_ERROR : undefined}
                            />

                            <Input
                                ref={emailRef}
                                id="email"
                                label="Email address"
                                type="email"
                                autoComplete="email"
                                required
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
                                error={emailError ? EMAIL_ERROR : undefined}
                            />

                            <Input
                                ref={passwordRef}
                                id="password"
                                label="Password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={8}
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
                                loading={registerMutation.isPending}
                                className="mt-2 w-full"
                            >
                                Create account
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
