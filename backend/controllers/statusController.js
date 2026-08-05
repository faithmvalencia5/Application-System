import { supabase } from "../supabase.js";

export async function getApplicationStatus(req, res) {
    const applicationId = req.params.applicationId;

    if (!applicationId) {
        return res.status(400).json({ success: false, message: "Application ID is required." });
    }

    try {
        const { data: applicationRow, error: applicationError } = await supabase
            .from("applications")
            .select("application_id, first_name, middle_name, surname, application_status")
            .eq("application_id", applicationId)
            .maybeSingle();

        if (applicationError) {
            throw applicationError;
        }

        if (!applicationRow) {
            return res.status(404).json({ success: false, message: "Application not found." });
        }

        const { data: statusHistoryRows, error: statusHistoryError } = await supabase
            .from("application_status_history")
            .select("status, updated_at")
            .eq("application_id", applicationId)
            .order("updated_at", { ascending: false })
            .limit(1);

        if (statusHistoryError) {
            throw statusHistoryError;
        }

        const latestStatus = statusHistoryRows && statusHistoryRows.length > 0 ? statusHistoryRows[0] : null;
        const statusText = (latestStatus && latestStatus.status) || applicationRow.application_status || "Pending";

        const applicantName = [applicationRow.first_name, applicationRow.middle_name, applicationRow.surname]
            .filter(Boolean)
            .join(" ")
            .trim();

        return res.status(200).json({
            success: true,
            application_id: applicationRow.application_id,
            applicant: applicantName || "Applicant",
            status: statusText,
            note: (latestStatus && latestStatus.remarks) || "Your application status has been updated."
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || "Unable to fetch application status." });
    }
}
