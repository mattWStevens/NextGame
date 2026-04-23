import { createContext } from 'react';
import type { ToastVariant } from '../components/ui/Toast';

export type ToastPosition =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';

export interface AddToastOptions {
    variant?: ToastVariant;
    position?: ToastPosition;
    duration?: number;
}

interface ToastActions {
    addToast: (message: string, options?: AddToastOptions) => void;
    removeToast: (id: string) => void;
}

export const DEFAULT_TOAST_DURATION = 4000;

export const ToastActionsContext = createContext<ToastActions | null>(null);
