'use client';

import { forwardRef } from 'react';
import PosterFrame from './PosterFrame';

interface TreePosterProps {
  surname: string;
  familyDisplayName: string;
  totalMembers: number;
  claimedMembers: number;
  storyCount: number;
  photoCount: number;
}

/**
 * TreePoster — 家族关系图 9:16 概览海报
 * 用 SVG 绘制装饰性家族树（不依赖 ReactFlow 截图，避免清晰度损失）
 */
const TreePoster = forwardRef<HTMLDivElement, TreePosterProps>(function TreePoster(
  { surname, familyDisplayName, totalMembers, claimedMembers, storyCount, photoCount },
  ref
) {
  return (
    <PosterFrame
      ref={ref}
      eyebrow={`${familyDisplayName || `${surname}氏家堂`}`}
      title="一棵家族树"
      subtitle="把关系理清楚，把故事留下来"
      watermark={`${new Date().getFullYear()}`}
    >
      {/* 中央装饰树 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 12,
          marginBottom: 24,
        }}
      >
        <svg width="540" height="540" viewBox="0 0 540 540" fill="none">
          {/* 多层枝干 */}
          <path
            d="M270 510 C260 400 280 320 240 230 C220 180 240 130 280 100"
            stroke="#B8924E"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M270 510 C290 410 270 320 320 240 C340 200 320 150 280 110"
            stroke="#D0A76A"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M280 220 C200 200 150 230 110 290"
            stroke="#B8924E"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M300 240 C380 220 430 250 470 310"
            stroke="#B8924E"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M280 160 C220 150 180 170 140 210"
            stroke="#D0A76A"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M310 170 C370 160 410 180 450 220"
            stroke="#D0A76A"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />

          {/* 节点 */}
          {[
            [270, 110, 28],
            [110, 290, 22],
            [470, 310, 22],
            [140, 210, 18],
            [450, 220, 18],
            [220, 170, 16],
            [350, 180, 16],
            [200, 320, 16],
            [380, 330, 16],
            [270, 410, 18],
          ].map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill="#FFFDF7" stroke="#B8924E" strokeWidth="2.4" />
              <circle cx={x} cy={y - r * 0.25} r={r * 0.22} fill="#B8924E" />
              <path
                d={`M${x - r * 0.4} ${y + r * 0.4}c${r * 0.07}-${r * 0.35} ${r * 0.73}-${r * 0.35} ${r * 0.8} 0`}
                fill="#B8924E"
              />
            </g>
          ))}

          {/* 装饰叶子 */}
          {[
            [90, 200, -28],
            [490, 250, 22],
            [180, 130, -18],
            [380, 110, 26],
            [120, 380, -22],
            [430, 380, 24],
          ].map(([x, y, rot], i) => (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx="18"
              ry="9"
              fill="#6F8A79"
              opacity="0.55"
              transform={`rotate(${rot} ${x} ${y})`}
            />
          ))}

          {/* 中央姓氏圆 */}
          <circle cx="270" cy="270" r="62" fill="#5A3524" />
          <circle cx="270" cy="270" r="56" fill="none" stroke="#D8B97E" strokeWidth="1.4" />
          <text
            x="270"
            y="296"
            fontSize="62"
            fontWeight="900"
            textAnchor="middle"
            fill="#D8B97E"
            fontFamily="serif"
          >
            {surname}
          </text>
        </svg>
      </div>

      {/* 4 项指标 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: 16,
          marginTop: 8,
        }}
      >
        {[
          { label: '家人', value: totalMembers, unit: '位' },
          { label: '已认领', value: claimedMembers, unit: '位' },
          { label: '故事', value: storyCount, unit: '篇' },
          { label: '影像', value: photoCount, unit: '份' },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 8px',
              borderRadius: 16,
              background: 'rgba(255, 253, 247, 0.65)',
              border: '1px solid rgba(122, 86, 64, 0.15)',
            }}
          >
            <div style={{ fontSize: 14, color: '#7A5640', letterSpacing: 2, display: 'flex' }}>
              {m.label}
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: '#2A1F18',
                marginTop: 4,
                fontFamily: 'serif',
                display: 'flex',
                alignItems: 'baseline',
                gap: 4,
              }}
            >
              {m.value}
              <span style={{ fontSize: 14, color: '#7A5640', fontWeight: 400 }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </PosterFrame>
  );
});

export default TreePoster;
