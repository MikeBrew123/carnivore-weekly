// Medical keyword detection — shared utility
// Used by check-in submission, member messages, and Claude draft pipeline
// Categories from spec + Hermes safety review

interface SafetyFlag {
  trigger: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const PATTERNS: { pattern: RegExp; category: string; severity: SafetyFlag['severity'] }[] = [
  // CRISIS — critical, immediate action
  { pattern: /\b(suicid|self.?harm|kill\s*(my|your)?self|want\s*to\s*die|end\s*(my|it\s*all))\b/i, category: 'self_harm', severity: 'critical' },
  { pattern: /\b(chest\s*pain|can'?t\s*breathe|heart\s*attack|faint(ed|ing)?|pass(ed)?\s*out|unconscious)\b/i, category: 'emergency', severity: 'critical' },

  // MEDICATION — high, always route to doctor
  { pattern: /\b(stop(ped)?\s*(my|taking|the)\s*meds?|quit\s*(my|the)\s*meds?|medication|metformin|insulin|blood\s*pressure\s*meds?|lisinopril|statin|warfarin|prescription)\b/i, category: 'medication', severity: 'high' },
  { pattern: /\b(change\s*(my|the)\s*dose|adjust\s*(my|the)\s*med|off\s*my\s*med)\b/i, category: 'medication', severity: 'high' },

  // SYMPTOMS — high
  { pattern: /\b(dizz(y|iness)|severe\s*(headache|pain|nausea)|vomit(ing)?|blood\s*in\s*(stool|urine)|rapid\s*heart|heart\s*palpit)\b/i, category: 'symptoms', severity: 'high' },
  { pattern: /\b(glucose|blood\s*sugar)\s*(is|was|at|of)\s*\d{2,3}/i, category: 'symptoms', severity: 'high' },

  // EATING DISORDER — high
  { pattern: /\b(binge|purg(e|ing)|anorexi|bulimi|eating\s*disorder|restrict(ing)?\s*(food|eating|calories))\b/i, category: 'eating_disorder', severity: 'high' },
  { pattern: /\b(punish\s*(my|your)self|haven'?t\s*eaten\s*in\s*\d+\s*day)\b/i, category: 'eating_disorder', severity: 'high' },

  // PREGNANCY — high
  { pattern: /\b(pregnan\w*|nursing|breastfeed\w*|fertil\w*|trying\s*to\s*(get\s*)?conceive)\b/i, category: 'pregnancy', severity: 'high' },

  // MINORS — high
  { pattern: /\b(my\s*(kid|child|son|daughter|teen)\s*(is|wants|started)|under\s*18|minor)\b/i, category: 'minors', severity: 'high' },

  // DOCTOR OVERRIDE — medium
  { pattern: /\b(doctor\s*(said|told|says)|ignore\s*(my|the)\s*doctor|don'?t\s*trust\s*(my|the)\s*doctor)\b/i, category: 'doctor_override', severity: 'medium' },
  { pattern: /\b(ldl|cholesterol|lab\s*results?|blood\s*work|a1c)\b/i, category: 'symptoms', severity: 'medium' },

  // GENERAL SYMPTOMS — medium
  { pattern: /\b(blood\s*pressure|hypertension|hypotension|thyroid|pcos|kidney|gout)\b/i, category: 'symptoms', severity: 'medium' },
  { pattern: /\b(depressed|depression|anxiety|mental\s*health)\b/i, category: 'symptoms', severity: 'medium' },
]

export function detectSafetyFlags(text: string): SafetyFlag[] {
  if (!text || text.trim().length === 0) return []

  const flags: SafetyFlag[] = []
  const seen = new Set<string>()

  for (const { pattern, category, severity } of PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const key = `${category}:${match[0].toLowerCase()}`
      if (!seen.has(key)) {
        seen.add(key)
        flags.push({
          trigger: match[0],
          category,
          severity,
        })
      }
    }
  }

  // Sort: critical first, then high, medium, low
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  flags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return flags
}
