import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '3D资源市场',
  description: '专业的3D资源交易平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
