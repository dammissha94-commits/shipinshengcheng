'use client';

import { forwardRef } from 'react';
import PosterFrame from './PosterFrame';

interface FestivalPosterProps {
  surname: string;
  familyDisplayName: string;
  /** 节日 / 节气名称，如「中秋节」「立春」 */
  festivalName: string;
  /** 节日类型：lunar 农历节日；solarTerm 节气；solar 公历节日 */
  type?: 'lunar' | 'solarTerm' | 'solar';
  /** 自定义祝福语；省略则按 festivalName 生成 */
  message?: string;
  date?: Date;
}

const TYPE_PALETTE: Record<NonNullable<FestivalPosterProps['type']>, { primary: string; accent: string; eyebrow: string }> = {
  lunar: { primary: '#C26946', accent: '#E89888', eyebrow: '传统节日' },
  solarTerm: { primary: '#6F8A79', accent: '#92AA9E', eyebrow: '二十四节气' },
  solar: { primary: '#B8924E', accent: '#D8B97E', eyebrow: '家庭纪念日' },
};

/**
 * FestivalPoster — 节日 / 节气 9:16 海报
 * 不同 type 自动切换主色
 */
const FestivalPoster = forwardRef<HTMLDivElement, FestivalPosterProps>(function FestivalPoster(
  { surname, familyDisplayName, festivalName, type = 'lunar', message, date },
  ref
) {
  const today = date ?? new Date();
  const palette = TYPE_PALETTE[type];
  const dateStamp = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(
    today.getDate()
  ).padStart(2, '0')}`;
  const greeting = message || `${familyDisplayName || `${surname}氏家堂`} 与家人共度`;

  return (
    <PosterFrame
      ref={ref}
      eyebrow={`${familyDisplayName || `${surname}氏家堂`} · ${palette.eyebrow}`}
      title={festivalName}
      watermark={dateStamp}
    >
      {/* 主装饰圆 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 32,
          paddingBottom: 32,
        }}
      >
        <svg width="480" height="480" viewBox="0 0 480 480" fill="none">
          {/* 外圈光晕 */}
          <circle cx="240" cy="240" r="220" fill={palette.accent} opacity="0.18" />
          <circle cx="240" cy="240" r="180" fill={palette.accent} opacity="0.28" />

          {/* 主圆 */}
          <circle cx="240" cy="240" r="140" fill={palette.primary} />
          <circle cx="240" cy="240" r="128" fill="none" stroke="#FFFDF7" strokeWidth="1.2" opacity="0.5" />
          <circle cx="240" cy="240" r="116" fill="none" stroke="#FFFDF7" strokeWidth="0.8" opacity="0.3" />

          {/* 节日单字 */}
          <text
            x="240"
            y="280"
            fontSize="120"
            fontWeight="900"
            textAnchor="middle"
            fill="#FFFDF7"
            fontFamily="serif"
            opacity="0.96"
          >
            {festivalName.slice(0, 1)}
          </text>

          {/* 周围装饰：12 个金点（一圈） */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const x = 240 + Math.cos(angle) * 200;
            const y = 240 + Math.sin(angle) * 200;
            return <circle key={i} cx={x} cy={y} r="6" fill={palette.primary} opacity="0.6" />;
          })}

          {/* 四向枝叶 */}
          {[
            [40, 240, 0],
            [440, 240, 180],
            [240, 40, -90],
            [240, 440, 90],
          ].map(([x, y, rot], i) => (
            <g key={i} transform={`rotate(${rot} ${x} ${y})`}>
              <ellipse cx={x} cy={y} rx="28" ry="10" fill="#6F8A79" opacity="0.6" />
            </g>
          ))}
        </svg>
      </div>

      {/* 祝福语 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          paddingBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ height: 1, width: 60, background: palette.primary, display: 'flex' }} />
          <span style={{ fontSize: 18, color: palette.primary, letterSpacing: 4, display: 'flex' }}>
            家堂记事
          </span>
          <span style={{ height: 1, width: 60, background: palette.primary, display: 'flex' }} />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: 28,
            color: '#2A1F18',
            fontWeight: 600,
            lineHeight: 1.6,
            textAlign: 'center',
            padding: '0 36px',
          }}
        >
          {greeting}
        </div>
      </div>
    </PosterFrame>
  );
});

export default FestivalPoster;
