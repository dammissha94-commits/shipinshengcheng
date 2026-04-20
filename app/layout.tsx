import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '麻将迷门店系统',
  description: '麻将迷门店经营操作系统 V1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
