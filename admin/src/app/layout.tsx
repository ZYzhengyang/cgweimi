import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '3D资源市场 - 管理后台',
  description: '3D资源市场管理后台',
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
