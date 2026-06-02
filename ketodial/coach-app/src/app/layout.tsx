import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "KetoDial Coach — Low-carb accountability coaching by text",
  description: "Weekly accountability coaching to stay consistent with your keto or carnivore plan. Human-reviewed check-ins. $49/month, cancel anytime.",
  metadataBase: new URL('https://coach.ketodial.com'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'KetoDial Coach — Low-carb accountability that actually checks in',
    description: 'Weekly accountability coaching for keto and carnivore. Human-reviewed check-ins. $49/month.',
    url: 'https://coach.ketodial.com',
    siteName: 'KetoDial Coach',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'KetoDial Coach — The low-carb coach that checks on you',
    description: 'Weekly text-based coaching for keto and carnivore. $49/month, cancel anytime.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Newsreader:ital,opsz,wght@0,16..72,400;0,16..72,500;1,16..72,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main-content" className="sr-only" style={{position:'absolute',left:'-9999px',top:'auto',width:'1px',height:'1px',overflow:'hidden'}}>Skip to content</a>
        <main id="main-content">{children}</main>
      </body>
    </html>
  )
}
