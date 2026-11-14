# Senior Citizen ID Registration System

A capstone project by:
- Bulanhagui, Cindy H.
- Soriano, John Rayver A.
- Valencia, Faith M.

The Senior Citizen ID Registration System is built for OSCA Bauan, Batangas to help senior citizens apply for their senior citizen IDs online. It streamlines submission, document upload, and status tracking while providing clear guidance to applicants.

> Note: This system is intended for transfer to OSCA Bauan management after official deployment. It is not intended for general public sharing, but as a managed solution for the local OSCA office.

## Features

- Online registration form for senior citizen ID applications
- Document upload support for valid ID front/back, latest photo, birth certificate, cedula, and signature
- Automatic age calculation from date of birth
- Family composition section with dynamic row entry
- Status tracking for submitted applications
- Registration disclaimer and consent flow
- Localized information for Bauan senior citizen benefits
- Responsive design for mobile and desktop use

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

Face, document, and age verification are separate FastAPI services. Each service needs its own Python virtual environment because their pinned OpenCV and ML dependencies are not guaranteed to be compatible in one environment.

For each service, open a separate terminal, enter its folder, create/activate a virtual environment, and install its requirements. Example for the face service:

```bash
cd face-verification
python -m venv .venv
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# macOS/Linux:
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

Repeat the same steps in separate terminals for:
- `document-verification`, using port `8002`
- `age-verification`, using port `8003`

The local launcher automatically configures the backend to use these three local service URLs. Face verification also requires the model files in `face-verification/models/`; document and age verification may require an OCR.Space API key according to their service configuration. If these services are not running, the main website and backend can still start, but verification requests will return a service-unavailable response.

## Vercel Deployment

The root `vercel.json` defines the frontend, Express backend, and three FastAPI verification services. Vercel service bindings provide `FACE_VERIFICATION_URL`, `DOCUMENT_VERIFICATION_URL`, and `AGE_VERIFICATION_URL` to the backend.

Configure the required Supabase, Gemini, and SMS environment variables in the Vercel project settings. Do not hardcode secrets in frontend files or commit them to GitHub. After a deployment, check `/health` for the Express backend and `/api/applications/verification-health` for the three verification services.

## Project Structure

- `index.html` - Homepage with OSCA overview, benefits, and registration guide
- `register-disclaimer.html` - Disclaimer and consent page before applicants access the registration form
- `form.html` - Application form for senior citizen identity registration
- `trackstatus.html` - Status tracking page for submitted applications
- `script.js` - Frontend logic for form handling, upload previews, validation, and status checks
- `style.css` - Responsive styling
- `backend/` - Express backend server and Supabase integration
- `face-verification/`, `document-verification/`, `age-verification/` - Python verification services
- `local-server.js` - Local static server and same-origin API proxy
- `local-dev.js` - Local frontend/backend launcher
- `vercel.json` - Vercel multi-service deployment and routing
