# Senior Citizen ID Registration System

A web-based application system for OSCA Bauan, Batangas. It supports online senior citizen ID applications, document uploads, duplicate checking, status tracking, and AI-assisted verification.

## Local Setup

Requires Node.js 22 or later. The frontend and Express backend are started together from the repository root.

1. Create `backend/.env` with the required backend credentials:

   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GEMINI_API_KEY=your_gemini_api_key
   PORT=3000
   ```

   Add any other credentials required by the features you use, such as SMS provider credentials. Keep this file private and never commit service-role keys.

2. Install backend dependencies:

   ```bash
   npm --prefix backend ci
   ```

3. From the repository root, start the frontend and backend:

   ```bash
   npm start
   ```

4. Open [http://localhost:5501](http://localhost:5501).

The local frontend serves the static website and proxies `/api`, `/health`, and `/healthz` to the Express backend on port 3000. This mirrors the same-origin routing used by the Vercel deployment. You can also start the services separately with `npm run start:backend` and `npm run start:frontend`.

### Local AI verification services

Face, document, and age verification are separate FastAPI services. Install each service's dependencies in its own virtual environment (or another isolated Python environment), then run each in a separate terminal from the repository root:

```bash
python -m pip install -r face-verification/requirements.txt
python -m pip install -r document-verification/requirements.txt
python -m pip install -r age-verification/requirements.txt
```

Run the services:

```bash
cd face-verification
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

```bash
cd document-verification
python -m uvicorn main:app --host 127.0.0.1 --port 8002
```

```bash
cd age-verification
python -m uvicorn main:app --host 127.0.0.1 --port 8003
```

The local launcher automatically configures the backend to use these three local service URLs. Face verification also requires the model files in `face-verification/models/`; document and age verification may require an OCR.Space API key according to their service configuration. If these services are not running, the main website and backend can still start, but verification requests will return a service-unavailable response.

## Vercel Deployment

The root `vercel.json` defines the frontend, Express backend, and three FastAPI verification services. Vercel service bindings provide `FACE_VERIFICATION_URL`, `DOCUMENT_VERIFICATION_URL`, and `AGE_VERIFICATION_URL` to the backend.

Configure the required Supabase and AI/SMS environment variables in the Vercel project settings. Do not hardcode secrets in frontend files or commit them to GitHub. After a deployment, check `/health` for the Express backend and `/api/applications/verification-health` for the three verification services.

## Project Structure

- `index.html`, `form.html`, `trackstatus.html`: Public-facing pages
- `script.js`, `language.js`: Frontend behavior
- `backend/`: Express API and Supabase integration
- `face-verification/`, `document-verification/`, `age-verification/`: FastAPI verification services
- `local-server.js`: Local static server and same-origin API proxy
- `local-dev.js`: One-command local frontend/backend launcher
- `vercel.json`: Vercel multi-service deployment and routing
