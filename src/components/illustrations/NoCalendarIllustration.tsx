/**
 * 暂无日历事件 — 空台历 + 月相装饰
 */
export default function NoCalendarIllustration({ size = 140 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="70" cy="124" rx="48" ry="5" fill="var(--surface-3)" opacity="0.55" />
      {/* 台历主体 */}
      <rect
        x="32"
        y="38"
        width="76"
        height="76"
        rx="8"
        fill="var(--surface-1)"
        stroke="var(--walnut)"
        strokeWidth="2.4"
      />
      {/* 顶部红条（节日感） */}
      <path
        d="M32 46c0-4 4-8 8-8h60c4 0 8 4 8 8v10H32V46Z"
        fill="var(--terracotta)"
        opacity="0.85"
      />
      {/* 装订夹 */}
      <rect x="46" y="30" width="6" height="14" rx="2" fill="var(--walnut)" />
      <rect x="88" y="30" width="6" height="14" rx="2" fill="var(--walnut)" />
      {/* 日期网格 */}
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={42 + col * 14}
            cy={70 + row * 12}
            r="3"
            fill={row === 1 && col === 2 ? 'var(--gold)' : 'var(--ink-3)'}
            opacity={row === 1 && col === 2 ? 1 : 0.35}
          />
        ))
      )}
      {/* 装饰：浮云 */}
      <path
        d="M104 26c0-4 6-6 10-2 2-3 8-2 8 3"
        stroke="var(--walnut-light)"
        strokeWidth="1.6"
        opacity="0.6"
        fill="none"
      />
    </svg>
  );
}
