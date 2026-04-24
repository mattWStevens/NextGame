import { useContext } from 'react';
import { ToastActionsContext } from '../providers/ToastContext';

export function useToast() {
    const ctx = useContext(ToastActionsContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return { toast: ctx.addToast };
}
