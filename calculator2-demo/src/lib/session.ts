// Local session management - NO database calls for free flow
// Data persists only in React state until checkout
const SESSION_COOKIE_NAME = 'cw_session'
const SESSION_STORAGE_KEY = 'cw_session'

function generateSecureToken(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    token += charset[randomValues[i] % charset.length]
  }
  return token
}

function setCookie(name: string, value: string, hours: number) {
  const date = new Date()
  date.setTime(date.getTime() + hours * 60 * 60 * 1000)
  document.cookie = name + '=' + value + ';expires=' + date.toUTCString() + ';path=/;SameSite=Strict'
}

function getCookie(name: string): string | null {
  const nameEQ = name + '='
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const trimmed = cookie.trim()
    if (trimmed.startsWith(nameEQ)) {
      return trimmed.substring(nameEQ.length)
    }
  }
  return null
}

export async function getOrCreateSession() {
  const existing = getCookie(SESSION_COOKIE_NAME) || localStorage.getItem(SESSION_STORAGE_KEY)

  if (existing) {
    return { session_token: existing }
  }

  const token = generateSecureToken(32)
  setCookie(SESSION_COOKIE_NAME, token, 48)
  localStorage.setItem(SESSION_STORAGE_KEY, token)
  return { session_token: token }
}

export function detectCountryFromHeaders(): string {
  return (window as any).__CLOUDFLARE_CF_COUNTRY || 'US'
}
