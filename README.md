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

## Project Structure

- `index.html` - Homepage with OSCA overview, benefits, and registration guide
- `register-disclaimer.html` - Disclaimer and consent page before applicants access the registration form
- `form.html` - Application form for senior citizen identity registration
- `trackstatus.html` - Status tracking page for application updates
- `script.js` - Frontend logic for form input handling, upload previews, validation, and status checks
- `style.css` - Project styling and responsive layout
- `backend/` - Express backend server and Supabase integration for file uploads and application processing


## Usage

- Visit the homepage to read about OSCA Bauan and the benefits available to senior citizens.
- Click **Register Now** to proceed to the disclaimer page.
- Confirm the disclaimer and complete the online application form.
- Upload required documents and submit the application.
- Use the tracking page to check the status of your application using the provided application ID.

## Notes

- The app uses Supabase storage for file uploads and Supabase tables for storing application data.
- Ensure the backend server is running and the API base URL is correctly configured in `script.js`.
- The project is designed for mobile-friendly use and includes validation for required fields.

