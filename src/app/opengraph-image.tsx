import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = '吾家祠堂 — 知来处，明亲缘，留家声';

/**
 * Open Graph 卡片 — 微信/Twitter/iMessage 分享时显示的预览图
 * 注意：next/og 的 ImageResponse 基于 Satori，所有多子节点 div 必须显式
 *      display:flex / contents / none，否则构建期会抛 prerender 错误。
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #F5EBD7 0%, #EBDDC0 60%, #D8B97E 100%)',
          fontFamily: 'sans-serif',
          color: '#2A1F18',
          padding: 80,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: 'linear-gradient(135deg, #5A3524 0%, #8B5A3C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
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
            <div style={{ display: 'flex', fontSize: 28, color: '#8A6A52', letterSpacing: 6 }}>
              FAMILY MEMORY OS
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 72,
                fontWeight: 900,
                letterSpacing: 12,
                color: '#2A1F18',
              }}
            >
              吾家祠堂
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 44,
            color: '#5A3524',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          <span>知来处，明亲缘，</span>
          <span>让家声代代有迹可循。</span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 60,
            fontSize: 22,
            color: '#8A6A52',
          }}
        >
          私密 · 家族可见 · 不做祭祀化
        </div>
      </div>
    ),
    { ...size }
  );
}
