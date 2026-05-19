import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Let's get to know each other — Catalyst AI",
  description: 'A short intake to help make our sessions genuinely useful to you.',
  robots: 'noindex, nofollow',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0F0E0D',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
