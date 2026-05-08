import type { Metadata, Viewport } from 'next';
import { themeBootstrapScript } from '@/lib/theme/theme';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';
import SkipToContent from '@/components/a11y/SkipToContent';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '吾家祠堂',
    template: '%s · 吾家祠堂',
  },
  description: '知来处，明亲缘，留家声。创建私密数字家堂，理清亲属关系，补充人生经历，收藏家庭记忆。',
  applicationName: '吾家祠堂',
  keywords: ['家族关系', '家族树', '数字家堂', '家庭记忆', '家人档案', '亲属称谓'],
  authors: [{ name: '吾家祠堂' }],
  creator: '吾家祠堂',
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  openGraph: {
    title: '吾家祠堂',
    description: '知来处，明亲缘，留家声',
    siteName: '吾家祠堂',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '吾家祠堂',
    description: '知来处，明亲缘，留家声',
  },
  robots: {
    index: true,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5EBD7' },
    { media: '(prefers-color-scheme: dark)', color: '#1A120D' },
  ],
  colorScheme: 'light',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* 主题 bootstrap：水合前同步设置 data-theme，避免 FOUC */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body
        className="min-h-full bg-[var(--surface-2)] text-[var(--ink-1)]"
        suppressHydrationWarning
      >
        <SkipToContent />
        <ServiceWorkerRegister />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
