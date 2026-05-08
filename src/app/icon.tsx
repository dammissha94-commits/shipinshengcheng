import { ImageResponse } from 'next/og';

/**
 * 动态生成的 favicon —— 暖核桃底 + 金色家族树印记
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 36,
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
