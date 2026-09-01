// Server Component wrapper, so the tab title is real metadata.
//
// The title used to be set with document.title inside an effect in the client
// component. It never held: Next streams metadata AFTER the initial UI, so the
// streamed <title> from layout.tsx overwrote it a moment later and every
// Carnivore Weekly member sat on a tab labelled "KetoDial Coach". The docs are
// explicit that a page needing client features should stay a Server Component
// and delegate the interactivity, which is what this file does.
//
// Cost, stated plainly: reading searchParams makes /login dynamic rather than
// static. For a sign-in page behind no cache that is a fair trade for showing
// people the product they actually bought.

import type { Metadata } from 'next'
import { brandFor, normaliseSite } from '@/lib/brand'
import LoginClient from './LoginClient'

export async function generateMetadata(
  { searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
): Promise<Metadata> {
  const params = await searchParams
  const raw = Array.isArray(params.site) ? params.site[0] : params.site
  const brand = brandFor(normaliseSite(raw))
  return {
    title: brand.product,
    // Sign-in pages have no business in an index, and this one now varies by
    // query string, which is exactly what crawlers should not be enumerating.
    robots: { index: false, follow: false },
  }
}

export default function LoginPage() {
  return <LoginClient />
}
