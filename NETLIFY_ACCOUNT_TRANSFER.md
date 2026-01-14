# Netlify Account Transfer / Site Name Reuse Guide

This document explains how to move the frontend site to a different Netlify account (or team) and reuse the same Netlify site name (example: `jobintell.netlify.app`). It lists exact steps, environment variable checks, backend CORS updates, verification commands, and rollback tips.

---

## Summary

If your current Netlify account has run out of credits and you want to move the site to a new Netlify account (using the same Netlify-provided site name or a custom domain), you must:

- Free or release the site name or domain on the old account (rename or delete the site), or transfer the site to the new account/team.
- Create the site in the new account and configure build settings and environment variables (especially `VITE_API_URL`).
- Ensure the backend (Render) `CORS_ORIGIN` includes the new origin (no trailing slash) and redeploy if necessary.
- Verify the new site works (login, API requests, SSE, CORS headers).

---

## Option A — Claim same Netlify site name in another account (recommended flow)

1. In OLD Netlify account (where `jobintell.netlify.app` currently lives):
   - Option 1 (rename to free name): Site settings → "General" → "Site details" → **Change site name** (pick a temporary name). This frees `jobintell` subdomain immediately.
   - Option 2 (delete site to free it): Site settings → Danger zone → **Delete this site**. Deleting permanently frees the subdomain. (Be careful — this removes historic deploys.)
   - Option 3 (transfer site to other team/user): Site settings → Transfer this site (if both accounts are in the same Nets or the site is eligible to transfer). This preserves history and settings, but requires collaboration between accounts.

2. In NEW Netlify account:
   - Create a new site (Sites → Add new site → Import from Git).
   - Connect to GitHub and select this repository (`alkasingh1121/JobIntel`, branch `main`).
   - Under Site settings / Build & deploy:
     - Build command: `npm ci && npm run build -w frontend` (or rely on `netlify.toml` in repo to define it).
     - Publish directory: `frontend/dist`.
     - Functions directory (if used): `frontend/netlify/functions`.
   - Under Site settings → Domain management: Change the site name to `jobintell` (or claim custom domain) if the subdomain is available.
   - Add Environment variables (Site → Settings → Build & deploy → Environment):
     - **VITE_API_URL** = `https://jobintel-backend.onrender.com` (production backend)
     - Any other frontend-specific keys you used in the old site (e.g., SENTRY_DSN, ANALYTICS config, etc.).
   - Trigger a deploy: Deploys → Clear deploy cache & deploy site (recommended for first deploy on new account).

3. Backend CORS update (important):
   - If your backend restricts origins using `CORS_ORIGIN` or similar, ensure it contains exactly `https://jobintell.netlify.app` (no trailing `/`).
   - On Render: Services → Select your service → Environment → Update `CORS_ORIGIN` and redeploy.
   - Note: if you renamed the new site (or use a custom domain), include that domain in `CORS_ORIGIN` too.

4. Verification / smoke tests:
   - Check that API requests from the browser do not return 404 to Netlify and go to backend:
     - In the browser network tab, login POST should go to `https://jobintel-backend.onrender.com/api/auth/login`.
   - Use curl to confirm CORS headers:
     - curl -i -H "Origin: https://jobintell.netlify.app" https://jobintel-backend.onrender.com/api/jobs?status=active
       - Expect header: `Access-Control-Allow-Origin: https://jobintell.netlify.app` (or `*` depending on your config)
   - Verify SSE content-type and response:
     - curl -i https://jobintel-backend.onrender.com/api/notifications/stream
       - Expect `Content-Type: text/event-stream` and connection to stream events.

---

## Option B — If you own the custom domain (e.g., `jobintel.com`) instead of a Netlify subdomain

1. Move DNS records to point to the new Netlify site (or update the CNAME/A records as instructed by Netlify when you add the domain to the new site).
2. Ensure the old Netlify site no longer claims the custom domain (remove it from old site) to allow verification on the new site.
3. After adding domain in new Netlify site, Netlify will verify DNS and provision TLS automatically (may take several minutes).

---

## Important project-side edits you should perform (or confirm) after moving

- Netlify site environment variables (in the Netlify UI) — add/update required envs:
  - VITE_API_URL (frontend) — must point to the backend: `https://jobintel-backend.onrender.com`.
  - Any build-time secrets used by your frontend must be added as Netlify env vars (do NOT commit secrets to git).

- Backend (Render) envs:
  - Ensure `CORS_ORIGIN` includes the Netlify domain(s) you will use. **Trim trailing slash** in the env value.
  - Redeploy the backend to pick up any CORS changes.

- Project files (if needed):
  - netlify.toml: usually fine to leave as-is (it defines build and publish settings). Do NOT store secrets here.
  - `frontend/.env` and `frontend/.env.example` should be used for local dev only — production env variables must be set in Netlify UI.

---

## How to verify everything is working after migration

1. Browse to `https://jobintell.netlify.app` and confirm site loads.
2. Test logging in with a valid admin account (or a real user) — confirm POST goes to backend (not Netlify) and returns 200.
3. Confirm jobs page fetches jobs and returns data.
4. Confirm SSE notifications connect (EventSource) and are not blocked by CORS or MIME type issues.
5. Run the curl checks described earlier.

---

## Rollback plan

- Keep the original Netlify site (don’t delete until new site is validated). If you temporarily rename it to free the name, you can always rename back.
- If the new deployment has issues, rename (or restore) the old site name and revert Netlify DNS/domain to the previous configuration.

---

## Security & Cleanup checklist

- Remove any hard-coded demo accounts or credentials from the front-end (already removed).
- Rotate any production credentials if they were leaked or exposed in public repo history.
- Verify no secrets in repo: `git grep -n "VITE_API_URL\|SECRET\|KEY\|TOKEN"` (search and ensure none are committed).

---

## Useful commands

- Build frontend locally (root of repo):
  - npm ci && npm run build -w frontend

- Quick backend CORS test:
  - curl -i -H "Origin: https://jobintell.netlify.app" https://jobintel-backend.onrender.com/api/jobs?status=active

- Verify EventSource by fetching stream headers:
  - curl -i https://jobintel-backend.onrender.com/api/notifications/stream

---

## Notes and tips

- If your Netlify team is paused due to credits, you can either: (a) move the site to a new account, (b) upgrade plan to restore immediate access, or (c) transfer the site to a new team (if possible).
- The fastest way to reuse the exact Netlify subdomain is to rename the old site (freeing the name) and then create the site with the same name in the new account or claim the name when importing the Git repo.
- Always set `VITE_API_URL` in the Netlify Site UI (not in committed files) and perform a "Clear deploy cache & deploy site" on the first deploy after migration.

---

If you'd like, I can also:
- Create a small migration checklist file in the repo that you can follow when you perform the actual transfer.
- Or, when you're ready, I can run verification steps after you complete the transfer.

— End of guide —
