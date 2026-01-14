# Deployment (Render backend + Netlify frontend)

This repository has been migrated away from Azure deployments. The recommended hosting setup now:

- Backend: Render (Web Service)
- Frontend: Netlify (Static site)

See steps below for quick setup and required environment variables.

## Backend (Render)
1. Create a new **Web Service** on Render and connect your GitHub repository.
2. Use the following build and start commands (or rely on `render.yaml` in repo):
   - Build command: `npm ci --prefix backend && npm run build --prefix backend`
   - Start command: `npm start --prefix backend`
3. Set required environment variables in Render (do not commit secrets):
   - `MONGO_URI`
   - `JWT_SECRET`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITHUB_CALLBACK_URL` -> `https://<your-backend>.onrender.com/auth/github/callback`

## Frontend (Netlify)
1. Create a new site on Netlify and connect your GitHub repository (select the `frontend` folder as base).
2. Build command: `npm ci && npm run build`
3. Publish directory: `dist`
4. Add environment variable in Netlify:
   - `VITE_API_URL` -> `https://<your-backend>.onrender.com`

## GitHub OAuth
- Create a GitHub OAuth App and set the callback URL to your backend callback:
  `https://<your-backend>.onrender.com/auth/github/callback`
- Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in Render (backend) environment variables.

## Notes
- `backend/.env.example` and `frontend/.env.example` are provided as templates. Do NOT commit `.env` files with secrets.
- `render.yaml` and `netlify.toml` are present to help configure the services.
- Removed Azure deployment workflows and references to avoid conflicts with new providers.

