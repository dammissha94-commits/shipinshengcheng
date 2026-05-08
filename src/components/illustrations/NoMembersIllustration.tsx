/**
 * 暂无家人 — 空椅 + 待入家人剪影
 */
export default function NoMembersIllustration({ size = 140 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="70" cy="124" rx="48" ry="6" fill="var(--surface-3)" opacity="0.55" />
      {/* 椅子 */}
      <path
        d="M44 122V72c0-3 2-6 6-6h40c4 0 6 3 6 6v50"
        stroke="var(--walnut)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect
        x="46"
        y="76"
        width="48"
        height="14"
        rx="3"
        fill="var(--walnut-light)"
        opacity="0.85"
      />
      <path d="M50 90v32M90 90v32" stroke="var(--walnut)" strokeWidth="2.4" strokeLinecap="round" />
      {/* 椅背图章 */}
      <circle cx="70" cy="58" r="8" fill="var(--gold)" opacity="0.55" />
      <path
        d="M70 56v-4M66 60h8"
        stroke="var(--walnut)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* 邀请的虚线人影 */}
      <g opacity="0.55">
        <circle cx="32" cy="44" r="9" stroke="var(--ink-3)" strokeWidth="1.6" strokeDasharray="3 3" />
        <path
          d="M22 70c0-7 5-12 10-12s10 5 10 12"
          stroke="var(--ink-3)"
          strokeWidth="1.6"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
      </g>
      <g opacity="0.55">
        <circle cx="108" cy="44" r="9" stroke="var(--ink-3)" strokeWidth="1.6" strokeDasharray="3 3" />
        <path
          d="M98 70c0-7 5-12 10-12s10 5 10 12"
          stroke="var(--ink-3)"
          strokeWidth="1.6"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
