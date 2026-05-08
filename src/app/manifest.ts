import type { MetadataRoute } from 'next';

/**
 * PWA Manifest — 让吾家祠堂可"添加到主屏幕"作为独立 app 启动。
 * 主题色与设计 token 中的 --walnut 同步。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '吾家祠堂',
    short_name: '吾家祠堂',
    description: '知来处，明亲缘，留家声',
    start_url: '/family',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F5EBD7',
    theme_color: '#5A3524',
    lang: 'zh-CN',
    categories: ['lifestyle', 'productivity', 'social'],
    icons: [
      {
        src: '/icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
