# Staff Applications Module

## Files
- `staff-applications.html`: Staff review queue and application detail drawer.
- `staff-applications.css`: Responsive styles.
- `staff-applications.js`: Search/filter, status review, document viewing, and document-authentication controls.
- `backend/routes/applicationRoutes.js`: Staff review routes.
- `backend/controllers/applicationController.js`: Staff applications list/detail and status update handlers.

## API
The page defaults to `https://osca-backend.onrender.com/api/applications`. Set `window.OSCA_API_BASE` before `staff-applications.js` to override it.

- `GET /applications/staff`: application queue and latest status/document counts.
- `GET /applications/staff/:applicationId`: application record, signed document URLs, status history, and ID requests.
- `PATCH /applications/staff/:applicationId/status`: appends a status-history entry. Allowed values: Pending, Under Review, In Process, Ready for Release, Completed, Rejected.
- `PATCH /applications/staff/:applicationId/document-authentication`: reuses the existing document-authentication controller/service.

## Important deployment/security note
The existing backend initializes Supabase with a service-role key. The staff routes added here are not, by themselves, an authentication/authorization layer. Before deployment for live records, protect the staff routes using the project's verified staff login/session middleware and enforce staff permissions on the server. Do not expose the Supabase service-role key in frontend code. Ensure the configured site origin is allowed by CORS and that the deployed API URL is correct.

## Schema verification
The current implementation appends status transitions into `application_status_history`. Its existing columns are confirmed to include `application_id`, `status`, and `updated_at`. Staff remarks are collected in the UI, but are not currently persisted because the deployed history-table schema has not been confirmed to include a remarks column. Confirm/add a nullable remarks column and then wire it through the handler if staff remarks need to be retained.

The detail endpoint relies on the existing `getApplicationByIdService`, which returns signed URLs for stored files. The staff UI handles these links as external HTTP(S) resources.
