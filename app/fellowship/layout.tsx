import type { Metadata } from 'next'

/* The root layout's title and description are the Catalyst intake's; the
   Fellowship application needs its own in the browser tab and link previews. */
export const metadata: Metadata = {
  title: 'Apply — Philanthropel Fellowship',
  description: 'Apply to the Philanthropel Fellowship. Open to anyone, from any background, anywhere in the world.',
  robots: 'noindex, nofollow',
}

export default function FellowshipLayout({ children }: { children: React.ReactNode }) {
  return children
}
