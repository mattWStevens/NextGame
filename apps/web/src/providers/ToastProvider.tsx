import { Fragment, useCallback, useMemo, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from '../components/ui/Toast';
import type { ToastVariant } from '../components/ui/Toast';
import {
    type AddToastOptions,
    type ToastPosition,
    DEFAULT_TOAST_DURATION,
    ToastActionsContext,
} from './ToastContext';

interface ToastItem {
    id: string;
    message: string;
    variant: ToastVariant;
    duration: number;
    position: ToastPosition;
}

type Action = { type: 'ADD'; toast: ToastItem } | { type: 'REMOVE'; id: string };

const MAX_TOASTS = 5;

function reducer(state: ToastItem[], action: Action): ToastItem[] {
    switch (action.type) {
        case 'ADD': {
            const next = [...state, action.toast];
            return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
        }
        case 'REMOVE':
            return state.filter((t) => t.id !== action.id);
    }
}

const positionClasses: Record<ToastPosition, string> = {
    'top-left': 'fixed top-4 left-4',
    'top-center': 'fixed top-4 left-1/2 -translate-x-1/2',
    'top-right': 'fixed top-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'fixed bottom-4 right-4',
};

interface ToastProviderProps {
    children: React.ReactNode;
    position?: ToastPosition;
}

export function ToastProvider({ children, position = 'bottom-right' }: ToastProviderProps) {
    const [toasts, dispatch] = useReducer(reducer, []);

    const removeToast = useCallback((id: string) => {
        dispatch({ type: 'REMOVE', id });
    }, []);

    const addToast = useCallback(
        (message: string, options?: AddToastOptions) => {
            dispatch({
                type: 'ADD',
                toast: {
                    id: crypto.randomUUID(),
                    message,
                    variant: options?.variant ?? 'info',
                    duration: options?.duration ?? DEFAULT_TOAST_DURATION,
                    position: options?.position ?? position,
                },
            });
        },
        [position],
    );

    const actions = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

    const groups = toasts.reduce<Record<string, ToastItem[]>>((acc, toast) => {
        (acc[toast.position] ??= []).push(toast);
        return acc;
    }, {});

    return (
        <ToastActionsContext.Provider value={actions}>
            {children}
            {Object.entries(groups).map(([pos, items]) => (
                <Fragment key={pos}>
                    {createPortal(
                        <ul
                            className={`${positionClasses[pos as ToastPosition]} z-50 flex flex-col gap-2 pointer-events-none`}
                            aria-label="Notifications"
                        >
                            {items.map((t) => (
                                <Toast key={t.id} {...t} onDismiss={removeToast} />
                            ))}
                        </ul>,
                        document.body,
                    )}
                </Fragment>
            ))}
        </ToastActionsContext.Provider>
    );
}
