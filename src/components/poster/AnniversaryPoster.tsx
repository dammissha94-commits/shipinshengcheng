'use client';

import { forwardRef } from 'react';
import PosterFrame from './PosterFrame';

interface AnniversaryPosterProps {
  surname: string;
  familyDisplayName: string;
  /** 纪念日标题（如「金婚纪念日」「父亲节」） */
  occasionTitle: string;
  /** 主角名字（可选） */
  personNames?: string[];
  /** 起始年（如结婚那年） */
  fromYear?: number;
  /** 当前日期 */
  date?: Date;
  /** 自定义文案 */
  description?: string;
}

/**
 * AnniversaryPoster — 纪念日 9:16 海报
 * 金线时光轴 + 起止年份 + 主角姓名串
 */
const AnniversaryPoster = forwardRef<HTMLDivElement, AnniversaryPosterProps>(
  function AnniversaryPoster(
    { surname, familyDisplayName, occasionTitle, personNames, fromYear, date, description },
    ref
  ) {
    const today = date ?? new Date();
    const yearNow = today.getFullYear();
    const yearsElapsed = fromYear ? Math.max(0, yearNow - fromYear) : null;
    const dateStamp = `${yearNow}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(
      today.getDate()
    ).padStart(2, '0')}`;
    const namesLabel = personNames && personNames.length > 0 ? personNames.join(' · ') : '';

    return (
      <PosterFrame
        ref={ref}
        eyebrow={`${familyDisplayName || `${surname}氏家堂`} · 家庭纪念日`}
        title={occasionTitle}
        subtitle={namesLabel}
        watermark={dateStamp}
      >
        {/* 时光轴 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 40,
            paddingBottom: 40,
          }}
        >
          <svg width="600" height="280" viewBox="0 0 600 280" fill="none">
            {/* 主时光线 */}
            <path
              d="M40 140 L560 140"
              stroke="#B8924E"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M40 140 L560 140"
              stroke="#D8B97E"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeDasharray="6 8"
              opacity="0.6"
            />

            {/* 起点 */}
            <circle cx="80" cy="140" r="22" fill="#FFFDF7" stroke="#5A3524" strokeWidth="3" />
            <circle cx="80" cy="140" r="10" fill="#5A3524" />
            {fromYear && (
              <text
                x="80"
                y="200"
                fontSize="28"
                fontWeight="700"
                textAnchor="middle"
                fill="#5A3524"
                fontFamily="serif"
              >
                {fromYear}
              </text>
            )}
            <text x="80" y="100" fontSize="18" textAnchor="middle" fill="#7A5640" letterSpacing="3">
              开始
            </text>

            {/* 中间装饰 */}
            {[180, 280, 380, 480].map((x, i) => (
              <g key={x}>
                <circle cx={x} cy="140" r="6" fill="#B8924E" opacity="0.6" />
                {i % 2 === 0 && (
                  <ellipse
                    cx={x}
                    cy={120}
                    rx="14"
                    ry="6"
                    fill="#6F8A79"
                    opacity="0.55"
                    transform={`rotate(-12 ${x} 120)`}
                  />
                )}
              </g>
            ))}

            {/* 终点 — 当前年 */}
            <circle cx="520" cy="140" r="28" fill="#5A3524" />
            <circle cx="520" cy="140" r="22" fill="none" stroke="#D8B97E" strokeWidth="1.4" />
            <text
              x="520"
              y="148"
              fontSize="20"
              fontWeight="900"
              textAnchor="middle"
              fill="#D8B97E"
              fontFamily="serif"
            >
              今
            </text>
            <text
              x="520"
              y="200"
              fontSize="28"
              fontWeight="700"
              textAnchor="middle"
              fill="#5A3524"
              fontFamily="serif"
            >
              {yearNow}
            </text>
            <text x="520" y="100" fontSize="18" textAnchor="middle" fill="#7A5640" letterSpacing="3">
              至今
            </text>

            {/* 中央数字 */}
            {yearsElapsed !== null && (
              <g>
                <text
                  x="300"
                  y="80"
                  fontSize="22"
                  fontWeight="500"
                  textAnchor="middle"
                  fill="#7A5640"
                  letterSpacing="6"
                >
                  历经
                </text>
                <text
                  x="300"
                  y="60"
                  fontSize="0"
                  fill="transparent"
                />
              </g>
            )}
          </svg>
        </div>

        {/* 大数字 */}
        {yearsElapsed !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 96, fontWeight: 900, color: '#5A3524', fontFamily: 'serif', display: 'flex' }}>
              {yearsElapsed}
            </span>
            <span style={{ fontSize: 28, color: '#7A5640', display: 'flex' }}>年</span>
          </div>
        )}

        {description && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              fontSize: 24,
              color: '#5A3524',
              lineHeight: 1.7,
              padding: '0 36px',
              textAlign: 'center',
            }}
          >
            {description}
          </div>
        )}
      </PosterFrame>
    );
  }
);

export default AnniversaryPoster;
