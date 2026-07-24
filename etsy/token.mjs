// Shared Etsy OAuth token accessor — SINGLE SOURCE OF TRUTH.
//
// The Supabase `etsy_tokens` row (id=primary) is the ONE store shared by the
// production Cloudflare Worker (api/calculator-api.js) and every local etsy/*
// script. Etsy rotates the refresh_token on every refresh and invalidates the
// previous one, so two independent chains (the old local secrets/api-keys.json
// copy vs. the Worker's Supabase row) clobbered each other — the root cause of
// the recurring "key rotated, log in again" (invalid_grant) errors. With one
// row, every refresh updates the same place and nothing gets invalidated out
// from under another caller.
//
// This module resolves secrets by absolute path (never cwd), reuses a still-valid
// access token (refreshes are rare, ~once/hour), and NEVER logs token values.

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve secrets from THIS file's location, never the caller's cwd.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SECRETS = path.resolve(__dirname, '..', 'secrets', 'api-keys.json');
const secrets = JSON.parse(readFileSync(SECRETS, 'utf8'));

// Etsy app identifiers — static, non-rotating. Safe to keep reading from the
// local file; these are not the rotating OAuth tokens.
export const ETSY_CLIENT_ID = secrets.etsy.api_key; // keystring / OAuth client_id
export const ETSY_SHARED_SECRET = secrets.etsy.shared_secret;

const SUPABASE_URL = String(secrets.supabase.url).replace(/\/+$/, '');
const SERVICE_KEY = secrets.supabase.service_role_key;
const ROW_URL = `${SUPABASE_URL}/rest/v1/etsy_tokens?id=eq.primary`;
const TABLE_URL = `${SUPABASE_URL}/rest/v1/etsy_tokens`;
const SB_HEADERS = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

const ACCESS_TTL_MS = 3600 * 1000; // Etsy access tokens live ~1 hour
const SAFETY_MS = 60 * 1000; // refresh 60s early to avoid edge-of-expiry failures

async function readRow() {
  const res = await fetch(`${ROW_URL}&select=*`, { headers: SB_HEADERS });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function patchRow(fields) {
  const res = await fetch(ROW_URL, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`Supabase write failed: ${res.status} ${await res.text()}`);
}

// Only ever writes columns that exist on etsy_tokens:
// id, access_token, refresh_token, expires_at, user_id, shop_id, created_at, updated_at.
async function upsertRow(fields) {
  const res = await fetch(TABLE_URL, {
    method: 'POST',
    headers: {
      ...SB_HEADERS,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ id: 'primary', ...fields }),
  });
  if (!res.ok) throw new Error(`Supabase upsert failed: ${res.status} ${await res.text()}`);
}

function tokenIsValid(row) {
  if (!row || !row.access_token) return false;
  // Prefer the real expires_at column; fall back to updated_at + TTL if it is absent.
  const basis = row.expires_at
    ? new Date(row.expires_at).getTime()
    : row.updated_at
      ? new Date(row.updated_at).getTime() + ACCESS_TTL_MS
      : 0;
  return Date.now() < basis - SAFETY_MS;
}

// One-time migration bridge. The Supabase row was empty when the consolidated
// scripts first ran. If the (now dormant) local secrets block still holds a
// refresh_token, copy it into the row so the single store is populated without a
// forced Etsy re-authorization. expires_at is set in the past so the very next
// getEtsyToken() performs a normal refresh through the shared row.
async function seedFromLocalFile() {
  const rt = secrets.etsy && secrets.etsy.refresh_token;
  const at = secrets.etsy && secrets.etsy.access_token;
  if (!rt || !at) return false;
  await upsertRow({
    access_token: at,
    refresh_token: rt,
    expires_at: new Date(0).toISOString(),
    updated_at: new Date().toISOString(),
  });
  return true;
}

async function refresh(row) {
  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ETSY_CLIENT_ID,
      refresh_token: row.refresh_token,
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error('etsy token refresh: ' + (j.error_description || j.error));
  await patchRow({
    access_token: j.access_token,
    // Etsy ROTATES the refresh_token on every refresh — persist it or the chain breaks.
    refresh_token: j.refresh_token,
    expires_at: new Date(Date.now() + (j.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  return j.access_token;
}

// Return a valid Etsy access token, refreshing (and persisting the rotation) only
// when the stored one is expired/missing.
export async function getEtsyToken() {
  let row = await readRow();
  if (!row) {
    const seeded = await seedFromLocalFile();
    if (!seeded) {
      throw new Error(
        'No etsy_tokens row in Supabase and no local token to seed it from. ' +
        'Re-authorize with: node etsy/etsy-oauth.mjs',
      );
    }
    row = await readRow();
  }
  if (tokenIsValid(row)) return row.access_token;
  return refresh(row);
}

// Standard Etsy API request headers used by every script.
export function etsyHeaders(token) {
  return {
    'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`,
    Authorization: `Bearer ${token}`,
  };
}

// Persist a freshly authorized token pair (from an authorization_code exchange)
// into the single Supabase store. Used by the one-time OAuth bootstrap so it
// seeds the shared row instead of a competing local file.
export async function seedEtsyTokens({ access_token, refresh_token, expires_in }) {
  await upsertRow({
    access_token,
    refresh_token,
    expires_at: new Date(Date.now() + (expires_in || 3600) * 1000).toISOString(),
    user_id: access_token ? String(access_token).split('.')[0] : null,
    updated_at: new Date().toISOString(),
  });
}
