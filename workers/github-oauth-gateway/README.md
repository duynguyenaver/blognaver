# BlogNaver GitHub OAuth Private Gateway

STATUS: Prepared but NOT deployed or provisioned. A frontend OAuth overlay is not real security on GitHub Pages.

## Architecture

Public Hugo blog stays on https://duynguyenaver.github.io/blognaver/ .
Private tools and Resume CMS are hosted on a Cloudflare Worker with Workers Static Assets:
- https://YOUR-WORKER.workers.dev/blognaver/tien-ich/
- https://YOUR-WORKER.workers.dev/blognaver/resume-cms/

Cloudflare assets.run_worker_first = true ensures every private asset is checked by Worker before delivery.
GitHub OAuth App uses authorization code, PKCE S256 and state cookie. The server verifies the GitHub numeric account ID and requests public_repo scope (for the current public BlogNaver repository).
Session ID lives in an opaque Secure/HttpOnly/SameSite=Lax cookie for up to 30 days. Access token is AES-256-GCM encrypted in Workers KV. GitHub tokens, client secret and the encryption key are never sent to frontend JavaScript.

Routes:
- GET /auth/start, GET /auth/callback, POST /auth/logout
- GET /api/session
- POST /api/github/contents: read/write encrypted data/**/*.enc.json only
- POST /api/github/archive-wav: optional WAV sync to archive branch (8MB maximum)

The browser facade static/github-auth.js provides session/readData/writeData/uploadWav/logout.
The existing TTS WAV uploader uses OAuth when running within the protected Worker.
Other tools must be migrated individually; there is no magic automatic sync of legacy browser state.

## Setup steps for owner (explicit actions required)

1. Create a Cloudflare account; install Wrangler CLI. From workers/github-oauth-gateway/ run:
   npx wrangler kv namespace create SESSIONS
   Set the returned namespace ID under SESSIONS in wrangler.toml.
2. Set PUBLIC_ORIGIN in wrangler.toml to the exact HTTPS Worker origin with no path or trailing slash.
   Verify GITHUB_OWNER_ID matches the owner's numeric GitHub /user id.
3. GitHub > Settings > Developer settings > OAuth Apps > New OAuth App:
   Homepage URL: PUBLIC_ORIGIN
   Authorization callback URL: PUBLIC_ORIGIN/auth/callback
   Authorization scope is public_repo (Worker enforces exact account and repository).
4. Add Worker secrets using interactive CLI, never commit or paste them into chat:
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   npx wrangler secret put TOKEN_ENCRYPTION_KEY
   TOKEN_ENCRYPTION_KEY must be base64 of 32 random bytes. Do not place secrets in GitHub Pages, localStorage, source files, or wrangler.toml.
5. Deploy: npx wrangler deploy .
6. In a clean browser, verify unauthenticated access redirects to GitHub, the owner can log in, a different GitHub account is denied, multiple private tools share the cookie, logout works, mutations require same origin, and encoded path traversal is rejected.
7. Only AFTER a successful deploy, update static/auth-config.json from an empty gatewayOrigin to PUBLIC_ORIGIN (via feature PR). This replaces the legacy PIN panel on public GitHub Pages with a GitHub sign-in link to the secure Worker.
8. Only after proving all Worker assets work, enable repo Actions variables:
   BN_PRIVATE_GATEWAY_LIVE=true
   BN_PRIVATE_GATEWAY_URL=PUBLIC_ORIGIN
   The protected Pages cutover script then replaces publicly hosted utility and Resume CMS files with login-redirect placeholders. Until then they remain publicly reachable on GitHub Pages.
9. Port each legacy utility's token-based GitHub calls to BNAuth.readData/BNAuth.writeData and AES-GCM encrypted .enc.json data with conflict management. Then remove each PAT input. The login infrastructure alone cannot make every existing tool auto-sync.

## Security limits

- The GitHub repository's PUBLIC source code remains visible after migration. Never embed confidential information in frontend files.
- OAuth Apps are scoped broadly across accessible public repositories: GitHub Apps with repo-specific installation permissions are preferable for least privilege.
- Only encrypted data files are allowed by the generic proxy, because the current BlogNaver repo is public.
- Session lasts up to 30 days, NOT forever; user must login again on expiry or token revocation. This OAuth App gateway expects long-lived access tokens and does not currently implement refresh token rotation.
- Do NOT enable expiring OAuth tokens without a safe refresh implementation.
- Uploaded WAVs on the public archive branch may be publicly accessible; keep audio sync opt-in.
- No direct main commits for source code: use feature branches/PR/CI. Data writes may be allowed only to constrained encrypted data paths after a utility migrates.
- Do not disable existing access paths before the Worker and Pages cutover is proven live.
- 'Auto sync' should operate on actual data modifications, not every page view or click.

## Regression tests

At repository root: node --test scripts/test-github-oauth-gateway.mjs
