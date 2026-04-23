import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
    primary:
        'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500 disabled:bg-indigo-600',
    secondary:
        'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 focus-visible:ring-gray-500 disabled:bg-gray-800',
    ghost: 'bg-transparent text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:ring-gray-500 disabled:bg-transparent',
    destructive:
        'bg-red-700 text-white hover:bg-red-600 focus-visible:ring-red-500 disabled:bg-red-700',
};

const sizeClasses: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
    lg: 'px-5 py-3 text-base rounded-lg gap-2',
};

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    children,
    className = '',
    ...props
}: ButtonProps) {
    const isDisabled = disabled ?? loading;

    return (
        <button
            {...props}
            disabled={isDisabled}
            aria-busy={loading}
            className={[
                'inline-flex items-center justify-center font-semibold transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',
                'disabled:cursor-not-allowed disabled:opacity-50',
                variantClasses[variant],
                sizeClasses[size],
                className,
            ].join(' ')}
        >
            {loading && <Spinner size="sm" />}
            {children}
        </button>
    );
}
