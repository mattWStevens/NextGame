import { useEffect, useState } from 'react';
import { DEFAULT_TOAST_DURATION } from '../../providers/ToastContext';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    id: string;
    message: string;
    variant: ToastVariant;
    duration?: number;
    onDismiss: (id: string) => void;
}

const variantStyles: Record<
    ToastVariant,
    { container: string; icon: string; path: string }
> = {
    success: {
        container: 'bg-green-950 border-green-800 text-green-100',
        icon: 'text-green-400',
        path: 'M5 13l4 4L19 7',
    },
    error: {
        container: 'bg-red-950 border-red-800 text-red-100',
        icon: 'text-red-400',
        path: 'M6 18L18 6M6 6l12 12',
    },
    warning: {
        container: 'bg-amber-950 border-amber-800 text-amber-100',
        icon: 'text-amber-400',
        path: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
    },
    info: {
        container: 'bg-indigo-950 border-indigo-800 text-indigo-100',
        icon: 'text-indigo-400',
        path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
};

export function Toast({ id, message, variant, duration = DEFAULT_TOAST_DURATION, onDismiss }: ToastProps) {
    const [visible, setVisible] = useState(false);
    const styles = variantStyles[variant];

    useEffect(() => {
        const raf = requestAnimationFrame(() => { setVisible(true); });
        return () => { cancelAnimationFrame(raf); };
    }, []);

    useEffect(() => {
        if (duration <= 0) return;
        const timer = setTimeout(() => { onDismiss(id); }, duration);
        return () => { clearTimeout(timer); };
    }, [id, duration, onDismiss]);

    const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

    return (
        <li
            role={role}
            className={[
                'pointer-events-auto flex w-80 items-start gap-3 rounded-lg border p-4 shadow-lg',
                'transition-opacity duration-300',
                styles.container,
                visible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
        >
            <svg
                className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d={styles.path} />
            </svg>
            <p className="flex-1 text-sm">{message}</p>
            <button
                type="button"
                onClick={() => { onDismiss(id); }}
                aria-label="Dismiss notification"
                className="shrink-0 text-white/40 transition-colors hover:text-white/80"
            >
                <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </li>
    );
}
