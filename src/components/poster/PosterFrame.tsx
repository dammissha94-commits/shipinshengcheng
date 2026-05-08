'use client';

import type { ReactNode } from 'react';
import { forwardRef } from 'react';

interface PosterFrameProps {
  /** 主标语（顶部 eyebrow） */
  eyebrow?: string;
  /** 大标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 海报主体内容 */
  children: ReactNode;
  /** 底部水印（如「吾家祠堂 · 2026 春」） */
  watermark?: string;
}

/**
 * PosterFrame — 9:16 海报基础框（750×1334px，3 倍 ≈ iPhone 海报）
 * 作为 html-to-image 的渲染目标。固定尺寸，离屏渲染，绝对定位 -9999。
 *
 * 设计：
 * - 暖纸面背景 + 双色渐变 + 网格底纹
 * - 顶部 eyebrow + 主标题
 * - 中部 children slot
 * - 底部家堂签章 + 水印
 */
const PosterFrame = forwardRef<HTMLDivElement, PosterFrameProps>(function PosterFrame(
  { eyebrow, title, subtitle, children, watermark },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        width: 750,
        height: 1334,
        position: 'fixed',
        top: -99999,
        left: -99999,
        background: `
          radial-gradient(circle at 12% 8%, rgba(216,185,126,0.30), transparent 480px),
          radial-gradient(circle at 88% 6%, rgba(111,138,121,0.22), transparent 420px),
          linear-gradient(180deg, #FFFDF7 0%, #F5EBD7 60%, #EBDDC0 100%)
        `,
        color: '#2A1F18',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif',
        padding: 60,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* 顶部装饰金线 */}
      <div
        style={{
          height: 4,
          width: 80,
          background: 'linear-gradient(90deg, #B8924E, #D8B97E)',
          borderRadius: 999,
          marginBottom: 28,
        }}
      />

      {eyebrow && (
        <div
          style={{
            fontSize: 22,
            color: '#7A5640',
            letterSpacing: 8,
            fontWeight: 500,
            marginBottom: 16,
          }}
        >
          {eyebrow}
        </div>
      )}

      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          lineHeight: 1.2,
          letterSpacing: 4,
          marginBottom: subtitle ? 20 : 36,
          color: '#2A1F18',
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            fontSize: 28,
            color: '#5A3524',
            lineHeight: 1.6,
            marginBottom: 36,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* 主体 slot — 占据剩余空间 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>

      {/* 底部签章 */}
      <div
        style={{
          marginTop: 40,
          paddingTop: 24,
          borderTop: '1px solid rgba(122, 86, 64, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #5A3524, #8B5A3C)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 19V6M12 11c-3-4-6-4-8-2 1 3 4 4 8 2ZM12 11c3-4 6-4 8-2-1 3-4 4-8 2ZM12 15c-2-3-5-3-7-1 1 2 4 3 7 1ZM12 15c2-3 5-3 7-1-1 2-4 3-7 1Z"
                stroke="#D8B97E"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#2A1F18', letterSpacing: 2 }}>
              吾家祠堂
            </div>
            <div style={{ fontSize: 14, color: '#7A5640', letterSpacing: 1.5 }}>
              FAMILY MEMORY OS
            </div>
          </div>
        </div>
        {watermark && (
          <div style={{ fontSize: 16, color: '#7A5640', letterSpacing: 1.5 }}>{watermark}</div>
        )}
      </div>
    </div>
  );
});

export default PosterFrame;
