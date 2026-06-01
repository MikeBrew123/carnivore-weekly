// All /app/* routes are dynamic (auth-gated, no prerendering)
export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
