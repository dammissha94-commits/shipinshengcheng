'use client';

import { forwardRef } from 'react';
import PosterFrame from './PosterFrame';

interface BirthdayPosterProps {
  surname: string;
  familyDisplayName: string;
  /** 寿星名字 */
  personName: string;
  /** 生日日期 */
  birthdayDate?: Date;
  /** 寿星年龄（可选） */
  age?: number | null;
  /** 自定义祝福语 */
  greeting?: string;
}

/**
 * BirthdayPoster — 生日 9:16 海报
 * 暖红喜庆基调 + 寿桃 + 双喜装饰
 * 不使用宗教/祭祀化元素
 */
const BirthdayPoster = forwardRef<HTMLDivElement, BirthdayPosterProps>(function BirthdayPoster(
  { surname, familyDisplayName, personName, birthdayDate, age, greeting },
  ref
) {
  const date = birthdayDate ?? new Date();
  const dateLabel = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate()
  ).padStart(2, '0')}`;
  const subtitle = age !== null && age !== undefined ? `${age} 岁生辰` : '生辰快乐';

  return (
    <PosterFrame
      ref={ref}
      eyebrow={`${familyDisplayName || `${surname}氏家堂`} · 家人生辰`}
      title={`${personName} 生日快乐`}
      subtitle={subtitle}
      watermark={dateLabel}
    >
      {/* 中央寿桃装饰 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 12,
        }}
      >
        <svg width="420" height="420" viewBox="0 0 420 420" fill="none">
          {/* 暖光晕 */}
          <circle cx="210" cy="210" r="180" fill="#F8E3CF" opacity="0.55" />
          <circle cx="210" cy="210" r="140" fill="#F2C8B0" opacity="0.45" />

          {/* 寿桃主体 */}
          <path
            d="M210 110
               C145 110 95 165 105 230
               C115 295 175 340 210 340
               C245 340 305 295 315 230
               C325 165 275 110 210 110 Z"
            fill="#E89888"
            stroke="#C26946"
            strokeWidth="4"
          />
          {/* 寿桃高光 */}
          <ellipse cx="170" cy="180" rx="32" ry="22" fill="#FBD9CF" opacity="0.85" />
          {/* 寿桃叶 */}
          <path
            d="M210 110 C175 80 130 80 110 105 C150 100 180 105 210 110 Z"
            fill="#6F8A79"
          />
          <path
            d="M210 110 C245 78 295 80 320 110 C275 100 240 100 210 110 Z"
            fill="#5C7A6A"
          />
          {/* 中心金线 */}
          <path
            d="M210 130 C200 200 200 280 210 340"
            stroke="#B8924E"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />

          {/* 寿字 */}
          <circle cx="210" cy="220" r="38" fill="#5A3524" />
          <circle cx="210" cy="220" r="34" fill="none" stroke="#D8B97E" strokeWidth="1.4" />
          <text
            x="210"
            y="240"
            fontSize="44"
            fontWeight="900"
            textAnchor="middle"
            fill="#D8B97E"
            fontFamily="serif"
          >
            寿
          </text>

          {/* 周围小桃花 */}
          {[
            [70, 180, 14],
            [350, 200, 14],
            [120, 100, 10],
            [300, 90, 10],
            [80, 320, 12],
            [340, 320, 12],
          ].map(([x, y, r], i) => (
            <g key={i} opacity="0.7">
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx={x}
                  cy={y}
                  rx={r * 0.8}
                  ry={r * 0.4}
                  fill="#E89888"
                  transform={`rotate(${deg} ${x} ${y})`}
                />
              ))}
              <circle cx={x} cy={y} r={r * 0.3} fill="#B8924E" />
            </g>
          ))}
        </svg>
      </div>

      {greeting && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: 26,
            color: '#5A3524',
            fontWeight: 600,
            lineHeight: 1.6,
            paddingLeft: 24,
            paddingRight: 24,
            textAlign: 'center',
            marginTop: -8,
          }}
        >
          {greeting}
        </div>
      )}
    </PosterFrame>
  );
});

export default BirthdayPoster;
