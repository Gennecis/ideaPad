import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ideaPad - Capture Brilliance',
  description: 'Turn sparks of genius into organized ideas. Effortlessly.',
  generator: 'ideaPad',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
