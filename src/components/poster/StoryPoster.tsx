'use client';

import { forwardRef } from 'react';
import PosterFrame from './PosterFrame';

interface StoryPosterProps {
  surname: string;
  familyDisplayName: string;
  storyTitle: string;
  storyYear?: number | null;
  storyContent?: string | null;
  authorName?: string;
  /** 海报底部的日期戳（默认今日） */
  stampDate?: Date;
}

/**
 * StoryPoster — 故事详情 9:16 分享海报
 * 暖纸面 + 引号装饰 + 摘要前 200 字 + 家堂签章
 */
const StoryPoster = forwardRef<HTMLDivElement, StoryPosterProps>(function StoryPoster(
  { surname, familyDisplayName, storyTitle, storyYear, storyContent, authorName, stampDate },
  ref
) {
  const date = stampDate ?? new Date();
  const stamp = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate()
  ).padStart(2, '0')}`;
  const yearLabel = storyYear ? `${storyYear} 年` : '岁月里';
  const excerpt = storyContent ? storyContent.slice(0, 240) : '';

  return (
    <PosterFrame
      ref={ref}
      eyebrow={`${familyDisplayName || `${surname}氏家堂`} · 家族故事`}
      title={storyTitle}
      subtitle={`${yearLabel}${authorName ? ` · ${authorName} 记录` : ''}`}
      watermark={`记于 ${stamp}`}
    >
      {/* 大引号 */}
      <div
        style={{
          fontSize: 180,
          lineHeight: 0.6,
          color: '#D8B97E',
          fontFamily: 'serif',
          opacity: 0.5,
          marginBottom: -40,
          paddingLeft: 8,
        }}
      >
        “
      </div>

      <div
        style={{
          fontSize: 30,
          lineHeight: 1.85,
          color: '#2A1F18',
          fontWeight: 400,
          paddingLeft: 24,
          paddingRight: 24,
          letterSpacing: 0.5,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {excerpt || (
          <span style={{ display: 'flex', color: '#7A5640' }}>
            （这段故事尚未记录正文）
          </span>
        )}
      </div>

      {/* 末尾装饰 */}
      <div
        style={{
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingLeft: 24,
        }}
      >
        <div
          style={{
            height: 1,
            width: 60,
            background: '#7A5640',
          }}
        />
        <div style={{ fontSize: 18, color: '#7A5640', letterSpacing: 4 }}>家族记忆</div>
      </div>
    </PosterFrame>
  );
});

export default StoryPoster;
