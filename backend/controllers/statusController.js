import { supabase } from "../supabase.js";

export async function getApplicationStatus(req, res) {
    const applicationId = req.params.applicationId;

    if (!applicationId) {
        return res.status(400).json({
            success: false,
            message: "Application ID is required."
        });
    }

    try {
        // Get the applicant's basic information
        const {
            data: applicationRow,
            error: applicationError
        } = await supabase
            .from("applications")
            .select(
                "application_id, first_name, middle_name, surname"
            )
            .eq("application_id", applicationId)
            .maybeSingle();

        if (applicationError) {
            throw applicationError;
        }

        if (!applicationRow) {
            return res.status(404).json({
                success: false,
                message: "Application not found."
            });
        }

        // Get the latest status-history entry
        const {
            data: statusHistoryRows,
            error: statusHistoryError
        } = await supabase
            .from("application_status_history")
            .select("status, updated_at")
            .eq("application_id", applicationId)
            .order("updated_at", { ascending: false })
            .limit(1);

        if (statusHistoryError) {
            throw statusHistoryError;
        }

        const latestStatus =
            statusHistoryRows && statusHistoryRows.length > 0
                ? statusHistoryRows[0]
                : null;

        const statusText =
            latestStatus?.status ||
            "Pending";

        const {
            data: activeIdRequest,
            error: idRequestError
        } = await supabase
            .from("id_requests")
            .select("id, request_status, reason, other_reason, requested_at")
            .eq("application_id", applicationId)
            .in(
                "request_status",
                ["Pending", "Under Review", "In Process", "Ready for Release", "Completed"]
            )
            .maybeSingle();

        if (idRequestError) {
            throw idRequestError;
        }

        const {
            data: reuploadRows,
            error: reuploadError
        } = await supabase
            .from("document_authentications")
            .select("document_type, authentication_status, authentication_remarks, updated_at")
            .eq("application_id", applicationId)
            .eq("authentication_status", "reupload");

        if (reuploadError) {
            throw reuploadError;
        }

        const documentLabels = {
            valid_id: "Valid ID (Front)",
            valid_id_back: "Valid ID (Back)",
            latest_photo: "Latest Photo",
            birth_certificate: "Birth Certificate",
            community_tax_certificate: "Community Tax Certificate (Cedula)",
            signature: "Signature"
        };

        const documentsRequiringReupload = (reuploadRows || []).map(row => ({
            document_type: row.document_type,
            label: documentLabels[row.document_type] || row.document_type,
            remarks: row.authentication_remarks || "Please upload a corrected copy.",
            updated_at: row.updated_at || null
        }));

        const applicantName = [
            applicationRow.first_name,
            applicationRow.middle_name,
            applicationRow.surname
        ]
            .filter(Boolean)
            .join(" ")
            .trim();

        return res.status(200).json({
            success: true,
            application_id: applicationRow.application_id,
            applicant: applicantName || "Applicant",
            status: statusText,
            status_updated_at: latestStatus?.updated_at || null,
            documents_requiring_reupload: documentsRequiringReupload,

            has_active_id_request: Boolean(activeIdRequest),

            id_request: activeIdRequest
                ? {
                    id: activeIdRequest.id,
                    status: activeIdRequest.request_status,
                    reason: activeIdRequest.reason,
                    other_reason: activeIdRequest.other_reason,
                    requested_at: activeIdRequest.requested_at
                }
                : null
        });

    } catch (error) {
        console.error("Status lookup error:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to fetch application status."
        });
    }
}