// Which product the member actually bought, for the UI.
//
// lib/email/send.ts has branded its emails per site since launch. The app did
// not, so a Carnivore Weekly buyer paid $49 for "Carnivore Coach", received a
// correctly branded receipt, and then landed on a product that called itself
// KetoDial on every screen — the login page, the tab title, the dashboard, and
// an onboarding waiver that told them they had bought low-carb coaching.
//
// Nothing was broken. It just looked like they had been handed to a different
// company at the exact moment a new buyer is most alert to that, which for a
// 55+ cohort reads as the shape of a scam rather than a shared platform.
//
// Keep this table in step with BRAND in lib/email/send.ts. If the two disagree
// the email will promise one product and the page will show another, which is
// the bug this file exists to remove.

export type CoachSite = 'ketodial' | 'carnivoreweekly'

export type CoachBrand = {
  /** Full product name, as it appears in prose and the tab title. */
  product: string
  /** Wordmark halves: `lead` renders plain, `tail` renders in the accent. */
  wordLead: string
  wordTail: string
  /** Small caps label beside the wordmark. Empty means render nothing. */
  sub: string
  /** How the product describes its own scope in the waiver. */
  discipline: string
  /** The brand the member thinks they bought from, for the platform note. */
  parent: string
  /** Shown pre-auth and on first run, because the domain will not match the
   *  brand they bought from until there is a coach.carnivoreweekly.com. */
  platformNote: string | null
}

const BRANDS: Record<CoachSite, CoachBrand> = {
  ketodial: {
    product: 'KetoDial Coach',
    wordLead: 'Keto',
    wordTail: 'Dial',
    sub: 'COACH',
    discipline: 'low-carb accountability coaching',
    parent: 'KetoDial',
    platformNote: null,
  },
  carnivoreweekly: {
    product: 'Carnivore Coach',
    wordLead: 'Carnivore',
    wordTail: 'Coach',
    sub: '',
    discipline: 'carnivore accountability coaching',
    parent: 'Carnivore Weekly',
    // Said plainly and up front. A buyer who was told to expect ketodial.com
    // is reassured; one who was not told is the one who assumes fraud.
    platformNote:
      'Carnivore Coach from Carnivore Weekly. It runs on ketodial.com, the coaching platform we use for both programs, so that is the address you will see.',
  },
}

export const DEFAULT_SITE: CoachSite = 'ketodial'

export function isCoachSite(value: unknown): value is CoachSite {
  return value === 'ketodial' || value === 'carnivoreweekly'
}

/** Never throws and never returns undefined: an unknown or missing site falls
 *  back to KetoDial, which is what every pre-existing member row holds. */
export function brandFor(site: unknown): CoachBrand {
  return BRANDS[isCoachSite(site) ? site : DEFAULT_SITE]
}

/** Accepts the shorthand used in URLs and email params ('cw' / 'kd') as well as
 *  the values stored in coach_members.site, so a link cannot brand the page
 *  wrongly just because it used the short form. */
export function normaliseSite(value: unknown): CoachSite {
  if (isCoachSite(value)) return value
  if (value === 'cw') return 'carnivoreweekly'
  if (value === 'kd') return 'ketodial'
  return DEFAULT_SITE
}
