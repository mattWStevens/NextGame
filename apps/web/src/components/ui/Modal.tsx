import { useEffect, useRef } from 'react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
        if (e.target === dialogRef.current) onClose();
    };

    const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
        e.preventDefault();
        onClose();
    };

    return (
        <dialog
            ref={dialogRef}
            onClick={handleClick}
            onCancel={handleCancel}
            className="m-auto w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-0 text-white shadow-2xl backdrop:bg-black/60"
        >
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                    <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>
            <div className="px-6 py-5">{children}</div>
        </dialog>
    );
}
