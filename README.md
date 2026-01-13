# JobIntel

## Imported from rekha/JobIntel

# JobScout

## Project info

This repository contains the JobScout web application.

Repository layout (scaffold):

- `frontend/` — (current app lives at project root `src/` and `public/`) Front-end React app. We can move files here on request.
- `backend/` — Express + TypeScript starter (see `backend/README.md`).
- `database/` — database migrations and helpers.
- `types/` — shared TypeScript types used across services.

## Editing and running locally

You can edit and run this project locally with Node.js and npm installed. Follow these steps:

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

## Technologies

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Monorepo commands

Run both services locally (requires root dependencies installed):

```bash
# install dev tools at root
npm install

# install workspace dependencies
npm run install:all

# run frontend + backend concurrently
npm run dev
```

Or use the `Makefile`:

```bash
make install
make dev
```

CI: see `.github/workflows/ci.yml` for the basic pipeline (install, lint, build).

## Deployment

Build with `npm run build` and deploy the generated `dist` directory to your hosting provider.

## Production notes

- **MONGODB_URI is required in production.** The server will refuse to start with an in-memory MongoDB when `NODE_ENV=production` unless `USE_INMEM=true` is explicitly set (not recommended).
- **Health & readiness**: A `/api/health` endpoint now reports the status of MongoDB and Redis. It returns `200` when healthy, `503` if degraded.
- **Redis is optional**: If `REDIS_URL` is not set, Redis features are disabled but the server will start. If Redis is configured but unreachable, `/api/health` will report degraded status.
- **Deployment recommendations**: Use a managed MongoDB (e.g., MongoDB Atlas) and a managed Redis service for production. Add health checks and readiness probes in your deployment platform so traffic only routes to healthy instances.
