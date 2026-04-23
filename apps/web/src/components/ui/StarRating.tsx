import { useState } from 'react';

interface StarRatingProps {
    value: number;
    onChange?: (rating: number) => void;
    readOnly?: boolean;
    name: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
};

function StarIcon({ filled, className }: { filled: boolean; className: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
        </svg>
    );
}

export function StarRating({
    value,
    onChange,
    readOnly = false,
    name,
    size = 'md',
}: StarRatingProps) {
    const [hovered, setHovered] = useState(0);
    const effective = hovered || value;

    return (
        <fieldset
            className="inline-flex items-center gap-0.5"
            onMouseLeave={() => {
                setHovered(0);
            }}
        >
            <legend className="sr-only">Rating: {value} out of 5 stars</legend>
            {[1, 2, 3, 4, 5].map((star) => (
                <label
                    key={star}
                    onMouseEnter={() => { if (!readOnly) setHovered(star); }}
                    className={readOnly ? 'cursor-default' : 'cursor-pointer'}
                >
                    <input
                        type="radio"
                        name={name}
                        value={star}
                        checked={value === star}
                        onChange={() => !readOnly && onChange?.(star)}
                        disabled={readOnly}
                        className="sr-only"
                        aria-label={`${String(star)} star${star !== 1 ? 's' : ''}`}
                    />
                    <StarIcon
                        filled={effective >= star}
                        className={`${sizeClasses[size]} transition-colors ${
                            effective >= star ? 'text-amber-400' : 'text-gray-600'
                        }`}
                    />
                </label>
            ))}
        </fieldset>
    );
}
