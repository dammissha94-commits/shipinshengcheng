/**
 * 暂无故事 — 摊开的线装古书 + 笔
 */
export default function NoStoriesIllustration({ size = 140 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="70" cy="116" rx="50" ry="6" fill="var(--surface-3)" opacity="0.55" />
      {/* 书本左页 */}
      <path
        d="M70 38C58 32 42 30 26 32v66c16-2 32 0 44 6V38Z"
        fill="var(--surface-1)"
        stroke="var(--walnut)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* 书本右页 */}
      <path
        d="M70 38c12-6 28-8 44-6v66c-16-2-32 0-44 6V38Z"
        fill="var(--surface-1)"
        stroke="var(--walnut)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* 中线 */}
      <path d="M70 38v66" stroke="var(--walnut)" strokeWidth="2" strokeLinecap="round" />
      {/* 文字横线 */}
      {[48, 58, 68, 78, 88].map((y) => (
        <g key={y}>
          <path
            d={`M34 ${y}h28`}
            stroke="var(--ink-3)"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d={`M78 ${y}h28`}
            stroke="var(--ink-3)"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.5"
          />
        </g>
      ))}
      {/* 装饰圆 */}
      <circle cx="48" cy="42" r="3" fill="var(--gold)" />
      <circle cx="92" cy="42" r="3" fill="var(--gold)" />
      {/* 笔 */}
      <g transform="rotate(38 100 24)">
        <rect x="100" y="20" width="22" height="6" rx="3" fill="var(--walnut)" />
        <path d="M120 20l6 3-6 3" fill="var(--gold)" />
      </g>
    </svg>
  );
}
