import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hex Territory',
  description: 'GPS-based territory capture game',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
