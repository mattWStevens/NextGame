import { cn } from '../../lib/cn';

type BadgeVariant = 'default' | 'blue' | 'amber' | 'green' | 'red' | 'indigo';

const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-gray-800 border-gray-700 text-gray-300',
    blue: 'bg-status-backlog-subtle border-status-backlog-muted text-status-backlog',
    amber: 'bg-status-playing-subtle border-status-playing-muted text-status-playing',
    green: 'bg-status-beaten-subtle border-status-beaten-muted text-status-beaten',
    red: 'bg-red-950/70 border-red-800 text-red-400',
    indigo: 'bg-indigo-950 border-indigo-800 text-indigo-300',
};

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                variantClasses[variant],
                className,
            )}
        >
            {children}
        </span>
    );
}
