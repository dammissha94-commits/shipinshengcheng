/**
 * 暂无活动 — 空时间轴 + 落叶
 */
export default function NoActivityIllustration({ size = 140 }: { size?: number }) {
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
      {/* 中央时间轴 */}
      <path d="M70 24v90" stroke="var(--walnut)" strokeWidth="2" strokeLinecap="round" />
      {/* 三个时间节点（淡） */}
      {[34, 60, 86].map((y) => (
        <g key={y} opacity="0.4">
          <circle cx="70" cy={y} r="6" stroke="var(--walnut)" strokeWidth="1.6" fill="var(--surface-1)" />
          <path d={`M58 ${y}h-22`} stroke="var(--ink-3)" strokeWidth="1.4" strokeDasharray="3 3" />
          <path d={`M82 ${y}h22`} stroke="var(--ink-3)" strokeWidth="1.4" strokeDasharray="3 3" />
        </g>
      ))}
      {/* 落叶 ×3 */}
      <g transform="rotate(28 30 50)">
        <ellipse cx="30" cy="50" rx="9" ry="4.5" fill="var(--jade)" opacity="0.65" />
        <path d="M21 50h18" stroke="var(--walnut)" strokeWidth="1" />
      </g>
      <g transform="rotate(-22 110 80)">
        <ellipse cx="110" cy="80" rx="9" ry="4.5" fill="var(--gold)" opacity="0.7" />
        <path d="M101 80h18" stroke="var(--walnut)" strokeWidth="1" />
      </g>
      <g transform="rotate(15 24 102)">
        <ellipse cx="24" cy="102" rx="7" ry="3.5" fill="var(--terracotta)" opacity="0.65" />
      </g>
    </svg>
  );
}
