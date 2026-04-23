/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                status: {
                    backlog: {
                        DEFAULT: '#60a5fa',
                        subtle: '#172554',
                        muted: '#1e40af',
                    },
                    playing: {
                        DEFAULT: '#fbbf24',
                        subtle: '#431407',
                        muted: '#92400e',
                    },
                    beaten: {
                        DEFAULT: '#4ade80',
                        subtle: '#052e16',
                        muted: '#166534',
                    },
                },
            },
        },
    },
    plugins: [],
};
