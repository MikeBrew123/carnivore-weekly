import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "KetoDial Coach — Low-carb accountability coaching by text",
  description: "Weekly text-based coaching to stay consistent with your keto or carnivore plan. AI-drafted, human-reviewed. $49/month, cancel anytime.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
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
