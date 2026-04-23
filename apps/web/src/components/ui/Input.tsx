interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    id: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
    const hasError = Boolean(error);

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-300">
                    {label}
                </label>
            )}
            <input
                id={id}
                aria-invalid={hasError}
                aria-describedby={hasError ? `${id}-error` : undefined}
                className={[
                    'w-full rounded-lg px-3.5 py-2.5 text-sm placeholder-gray-500 outline-none transition',
                    hasError
                        ? 'border-2 border-red-800 bg-red-950/50 text-red-400 focus:border-red-600 focus:ring-2 focus:ring-red-500/30'
                        : 'border border-gray-700 bg-gray-800 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30',
                    className,
                ].join(' ')}
                {...props}
            />
            {hasError && (
                <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}
