# OSCA Bauan Senior Citizen ID Application System

A web-based applicant portal for the Office for Senior Citizens Affairs (OSCA), Municipality of Bauan, Batangas. This is the applicant-facing component of the OSCA Senior Citizen ID Application and Record Management System.

## Project Team
- Cindy H. Bulanhagui
- John Rayver A. Soriano
- Faith M. Valencia

## Overview
The system allows eligible applicants to submit Senior Citizen ID applications online, upload supporting documents, and check application progress using their Application ID. It is designed to make the application process more accessible through a responsive interface and an OSCA virtual assistant.

> **Deployment note:** This project is intended to be managed by OSCA Bauan following its official deployment. It is not intended as a general-purpose public registration platform.

## Main Features

### Applicant services
- Online Senior Citizen ID application form organized into guided steps.
- Applicant information and family-composition entry.
- Upload of supporting documents, including valid ID images, recent formal photo, birth certificate or accepted residency alternative, cedula, and signature.
- Automatic age calculation from the applicant's date of birth.
- Application submission and Application ID notification by SMS when configured.
- Application status tracking using the Application ID.
- Applicant guidance and OSCA information through the virtual assistant.
- English and Filipino/Tagalog language support for the interface and chatbot content.

### Verification assistance
The application workflow is supported by separate verification services:
- Age and document checks, including OCR-based extraction and document-type screening.
- Face comparison assistance using submitted identity documents and the applicant's latest photo.
- Uncertain or failed automated checks can be referred for additional staff review; automated verification is an aid and does not replace OSCA's review.

### Accessibility
- Responsive layout for desktop and mobile devices.
- Senior-friendly text sizing and readable form controls.
- Guided form steps and clear required-field indicators.
- Mobile chatbot layout and language support.

## Technology
- **Frontend:** HTML, CSS, JavaScript
- **Application API:** Node.js, Express
- **Database and file storage:** Supabase
- **Virtual assistant:** Google Gemini through the Google GenAI SDK, with local FAQ responses for supported common questions
- **Verification services:** Python-based services in the age-verification/, document-verification/, and face-verification/ directories
- **SMS notifications:** UniSMS integration (requires credentials)

## Repository Structure
| Path | Purpose |
|---|---|
| index.html | Public homepage and OSCA information |
| register-disclaimer.html | Applicant disclaimer and consent |
| form.html | Multi-step Senior Citizen ID application form |
| trackstatus.html | Application status tracking |
| script.js | Main frontend behavior, form workflow, and chatbot client |
| language.js | Interface language support |
| style.css | Main responsive styling |
| backend/ | Express API, routes, controllers, and services |
| age-verification/ | Age/document verification service |
| document-verification/ | OCR and document validation service |
| face-verification/ | Face comparison service and model assets |

## Local Development

### Prerequisites
- Node.js and npm
- Python 3 for the verification services
- A configured Supabase project
- API credentials for the external services enabled in your deployment

### Application backend
1. Open a terminal in the backend/ directory.
2. Install dependencies:
   
       npm install

3. Configure backend environment variables in a private .env file. Supply the Supabase credentials and API keys required by the integrations you enable (for example, Gemini and UniSMS). Use the variable names expected by the backend services.
4. Start the backend:

       npm run dev

The backend exposes a lightweight health endpoint at /health.

### Frontend
Serve the repository's static files with a local development server and configure the frontend API endpoint for that local backend. Open index.html through the local server rather than directly from the filesystem.

### Python verification services
Each verification service has its own requirements.txt. Install the requirements and configure service endpoints and environment variables according to the deployment configuration before starting the corresponding Python application.

## Deployment
The project is structured for separate frontend/API and Python verification service deployments. Configure each deployed service's environment variables and endpoint URLs in the hosting platform. Do not commit credentials, private applicant data, or production database records.

## Security and Privacy
- Keep all API keys and Supabase secrets in server-side environment variables.
- Do not expose secret keys in frontend JavaScript.
- Do not commit .env files or real applicant documents/data.
- Treat OCR and face-comparison outputs as verification assistance; route uncertain cases to authorized OSCA personnel.
- Handle applicant information in accordance with applicable privacy requirements, including the Philippine Data Privacy Act.

## Companion System
This repository contains the applicant-facing application. Staff record management, application processing, ID issuance, and administrative analytics are handled by the companion [OSCA Record Management System](https://github.com/faithmvalencia5/Record-Management-System).
