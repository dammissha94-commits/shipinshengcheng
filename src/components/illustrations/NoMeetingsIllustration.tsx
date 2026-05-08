/**
 * 暂无议事 — 圆桌 + 茶具
 */
export default function NoMeetingsIllustration({ size = 140 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="70" cy="120" rx="56" ry="6" fill="var(--surface-3)" opacity="0.55" />
      {/* 桌面 */}
      <ellipse cx="70" cy="80" rx="50" ry="14" fill="var(--walnut-light)" />
      <ellipse cx="70" cy="78" rx="50" ry="14" fill="var(--walnut)" opacity="0.95" />
      <ellipse cx="70" cy="78" rx="42" ry="10" fill="var(--gold-light)" opacity="0.65" />
      {/* 茶壶 */}
      <path
        d="M58 70v-8c0-3 2-5 5-5h14c3 0 5 2 5 5v8"
        stroke="var(--walnut)"
        strokeWidth="2"
        fill="var(--surface-1)"
      />
      <path d="M82 64h6c2 0 3 2 2 4l-3 4" stroke="var(--walnut)" strokeWidth="2" fill="none" />
      <circle cx="70" cy="50" r="2" fill="var(--gold)" />
      <path d="M70 48v-6" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" />
      {/* 茶杯 ×3 */}
      <g>
        <ellipse cx="36" cy="74" rx="6" ry="3" fill="var(--surface-1)" stroke="var(--walnut)" strokeWidth="1.4" />
        <path d="M30 74v3c0 2 3 3 6 3s6-1 6-3v-3" fill="var(--surface-1)" stroke="var(--walnut)" strokeWidth="1.4" />
      </g>
      <g>
        <ellipse cx="104" cy="74" rx="6" ry="3" fill="var(--surface-1)" stroke="var(--walnut)" strokeWidth="1.4" />
        <path d="M98 74v3c0 2 3 3 6 3s6-1 6-3v-3" fill="var(--surface-1)" stroke="var(--walnut)" strokeWidth="1.4" />
      </g>
      {/* 桌腿 */}
      <path
        d="M40 92l4 18M100 92l-4 18"
        stroke="var(--walnut)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
