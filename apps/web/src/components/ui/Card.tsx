interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export function Card({ children, className = '' }: CardProps) {
    return (
        <div className={`rounded-xl border border-gray-800 bg-gray-900 shadow-lg ${className}`}>
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '' }: CardProps) {
    return (
        <div className={`border-b border-gray-800 px-5 py-4 ${className}`}>{children}</div>
    );
}

export function CardBody({ children, className = '' }: CardProps) {
    return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardProps) {
    return (
        <div className={`border-t border-gray-800 px-5 py-4 ${className}`}>{children}</div>
    );
}
