import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/**
 * Apple Touch Icon — 与 favicon 同源设计，确保 iOS 主屏图标一致
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #5A3524 0%, #8B5A3C 100%)',
        }}
      >
        <svg width="128" height="128" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 19V6M12 11c-3-4-6-4-8-2 1 3 4 4 8 2ZM12 11c3-4 6-4 8-2-1 3-4 4-8 2ZM12 15c-2-3-5-3-7-1 1 2 4 3 7 1ZM12 15c2-3 5-3 7-1-1 2-4 3-7 1Z"
            stroke="#D8B97E"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
