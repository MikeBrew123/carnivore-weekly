export function KdLogo() {
  return (
    <svg className="mark" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="19" fill="#0b1620"/>
      <path d="M9 25 A 12 12 0 1 1 31 25" stroke="#1e3a52" strokeWidth="3" strokeLinecap="round"/>
      <path d="M9 25 A 12 12 0 0 1 18.5 8.4" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round"/>
      <line x1="20" y1="20" x2="26.5" y2="13.5" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round"/>
      <circle cx="20" cy="20" r="3" fill="#e2eef7"/>
    </svg>
  )
}

export function KdBrand({ dark = false }: { dark?: boolean }) {
  return (
    <span className="kd-brand">
      <KdLogo />
      <span className="word" style={dark ? { color: '#fff' } : undefined}>Keto<b>Dial</b></span>
      <span className="sub">Coach</span>
    </span>
  )
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7"/>
    </svg>
  )
}
