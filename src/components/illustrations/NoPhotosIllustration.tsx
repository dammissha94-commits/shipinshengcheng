/**
 * 暂无照片 — 空相框 + 浮起的相片
 */
export default function NoPhotosIllustration({ size = 140 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="70" cy="120" rx="50" ry="5" fill="var(--surface-3)" opacity="0.55" />
      {/* 后方相片 */}
      <g transform="rotate(-12 38 60)">
        <rect
          x="20"
          y="40"
          width="44"
          height="50"
          rx="4"
          fill="var(--surface-1)"
          stroke="var(--walnut)"
          strokeWidth="2"
        />
        <rect x="26" y="46" width="32" height="32" fill="var(--surface-3)" />
        <circle cx="34" cy="58" r="4" fill="var(--gold)" />
        <path
          d="M28 76l8-8 6 5 8-9 6 7"
          stroke="var(--walnut-light)"
          strokeWidth="1.6"
          fill="none"
        />
      </g>
      {/* 前方主相框 */}
      <rect
        x="44"
        y="44"
        width="56"
        height="60"
        rx="5"
        fill="var(--surface-1)"
        stroke="var(--walnut)"
        strokeWidth="2.4"
      />
      <rect x="50" y="50" width="44" height="40" fill="var(--surface-2)" />
      {/* 内部虚线占位（暗示尚无照片） */}
      <path
        d="M50 90l16-16 12 10 16-18"
        stroke="var(--ink-3)"
        strokeWidth="1.8"
        strokeDasharray="4 4"
        fill="none"
        opacity="0.6"
      />
      <circle cx="62" cy="60" r="4.5" stroke="var(--ink-3)" strokeWidth="1.6" strokeDasharray="3 3" />
      {/* 题名横条 */}
      <rect x="58" y="94" width="28" height="4" rx="2" fill="var(--gold)" opacity="0.6" />
    </svg>
  );
}
