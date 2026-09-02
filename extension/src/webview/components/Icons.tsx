/** 极简线性图标：统一 12px 网格、1.3 描边、圆角端点 */
const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

const svg = (children: React.ReactNode) => (
    <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
        {children}
    </svg>
);

export const Icons = {
    chevronDown: svg(<path d="M3 4.75 6 7.75 9 4.75" {...stroke} />),
    play: svg(
        <path
            d="M4.25 2.6 9.6 6l-5.35 3.4Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinejoin="round"
        />,
    ),
    trash: svg(<path d="M2.75 3.5h6.5M4.75 3.5v-1h2.5v1M3.75 3.5l.4 6h3.7l.4-6" {...stroke} />),
    copy: svg(
        <>
            <rect x="4.25" y="4.25" width="5.5" height="6" rx="1.2" {...stroke} />
            <path
                d="M7.75 4.25v-1a1.2 1.2 0 0 0-1.2-1.2H3.45a1.2 1.2 0 0 0-1.2 1.2v3.6a1.2 1.2 0 0 0 1.2 1.2h.8"
                {...stroke}
            />
        </>,
    ),
    setExpected: svg(<path d="M9.5 6h-7M5 3.5 2.5 6 5 8.5" {...stroke} />),
    expand: svg(
        <path
            d="M2 4.5v-1.3c0-.66.54-1.2 1.2-1.2h1.3M7.5 2h1.3c.66 0 1.2.54 1.2 1.2v1.3M10 7.5v1.3c0 .66-.54 1.2-1.2 1.2H7.5M4.5 10H3.2A1.2 1.2 0 0 1 2 8.8V7.5"
            {...stroke}
        />,
    ),
    clear: svg(<path d="M3.5 3.5l5 5M8.5 3.5l-5 5" {...stroke} />),
};
