/**
 * HeroTreeIllustration — 数字家堂首页主视觉的树形装饰 SVG
 * 纯展示组件，无副作用、无数据。
 */
export default function HeroTreeIllustration() {
  const nodes = [
    [120, 18], [162, 46], [196, 74], [152, 112],
    [92, 88], [62, 128], [212, 126], [170, 158], [230, 162],
  ] as const;
  const leaves = [
    [77, 48], [65, 64], [145, 52], [178, 91], [210, 84], [91, 112],
  ] as const;

  return (
    <svg viewBox="0 0 240 190" className="h-full w-full" fill="none" aria-hidden>
      <path d="M97 190C120 136 118 105 112 73C110 56 111 42 124 28" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" />
      <path d="M105 190C128 142 129 112 124 78C121 54 130 40 151 33" stroke="#D0A76A" strokeWidth="2" strokeLinecap="round" />
      <path d="M111 190C138 150 145 122 142 91C140 65 151 51 181 44" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M125 88C90 70 70 78 54 104" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M137 95C165 84 184 92 205 118" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M132 62C160 70 177 86 190 106" stroke="#D0A76A" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M113 60C89 44 70 41 48 51" stroke="#D0A76A" strokeWidth="1.6" strokeLinecap="round" />
      {nodes.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="14" fill="var(--surface-3)" stroke="var(--gold)" strokeWidth="1.4" />
          <circle cx={x} cy={y - 4} r="3.4" fill="var(--gold)" />
          <path d={`M${x - 6} ${y + 6}c1-5 11-5 12 0`} fill="var(--gold)" />
        </g>
      ))}
      {leaves.map(([x, y], i) => (
        <ellipse
          key={`${x}-${y}-${i}`}
          cx={x}
          cy={y}
          rx="9"
          ry="4.5"
          fill="var(--jade)"
          opacity=".58"
          transform={`rotate(${i % 2 ? -26 : 28} ${x} ${y})`}
        />
      ))}
    </svg>
  );
}
