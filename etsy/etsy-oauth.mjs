#!/usr/bin/env node
/**
 * Etsy OAuth 2.0 PKCE Flow
 * Run: node scripts/etsy-oauth.mjs
 */

import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';

const CLIENT_ID = 'duahf60yca5rgztur8ighq6d';
const REDIRECT_URI = 'http://localhost:3456/callback';
const SCOPES = 'listings_r listings_w shops_r';

// Generate PKCE challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

const { verifier, challenge } = generatePKCE();
const state = crypto.randomBytes(16).toString('hex');

// Build auth URL
const authUrl = new URL('https://www.etsy.com/oauth/connect');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('code_challenge', challenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

console.log('\n🔐 Etsy OAuth Setup\n');
console.log('Open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\n⏳ Waiting for callback on http://localhost:3456...\n');

// Start local server to catch callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');

    if (returnedState !== state) {
      res.writeHead(400);
      res.end('State mismatch - possible CSRF attack');
      return;
    }

    if (!code) {
      res.writeHead(400);
      res.end('No authorization code received');
      return;
    }

    // Exchange code for tokens
    try {
      const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          code,
          code_verifier: verifier
        })
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error('\n❌ Token exchange failed:', tokens);
        res.writeHead(400);
        res.end(`Error: ${tokens.error_description || tokens.error}`);
      } else {
        console.log('\n✅ SUCCESS! Tokens received:\n');
        console.log('Access Token:', tokens.access_token?.substring(0, 20) + '...');
        console.log('Refresh Token:', tokens.refresh_token);
        console.log('Expires In:', tokens.expires_in, 'seconds');
        console.log('\n📋 Add this refresh_token to secrets/api-keys.json');
        console.log('\n🔧 Then add to Wrangler:');
        console.log(`   wrangler secret put ETSY_REFRESH_TOKEN`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html><body style="font-family:system-ui;padding:40px;text-align:center">
            <h1>✅ Etsy Connected!</h1>
            <p>Refresh token received. Check your terminal.</p>
            <p>You can close this window.</p>
          </body></html>
        `);
      }
    } catch (err) {
      console.error('\n❌ Error:', err.message);
      res.writeHead(500);
      res.end(`Error: ${err.message}`);
    }

    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 1000);
  }
});

server.listen(3456);
