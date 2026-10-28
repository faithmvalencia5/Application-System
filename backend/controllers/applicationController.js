import { supabase } from "../supabase.js";
import {
    registerApplication as registerApplicationService,
    getApplicationById as getApplicationByIdService,
    updateApplication as updateApplicationService,
    submitIdRequest as submitIdRequestService,
    createDuplicateVerificationSession as createDuplicateVerificationSessionService,
    verifyDuplicateIdentity as verifyDuplicateIdentityService,
    getVerifiedDuplicateApplication as getVerifiedDuplicateApplicationService,
    updateVerifiedDuplicateApplication as updateVerifiedDuplicateApplicationService,
    recoverVerifiedApplicationId as recoverVerifiedApplicationIdService,
    updateDocumentAuthentication as updateDocumentAuthenticationService
} from "../services/applicationService.js";


export async function testDatabase(req, res) {
    const { data, error } = await supabase
        .from("applications")
        .select("*")
        .limit(5);

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);
}

export async function registerApplication(req, res) {

    try {

        const payload = JSON.parse(req.body.payload);

        const result = await registerApplicationService(payload, req.files);
        if (result.duplicate) {
            return res.status(409).json({
                success: false,

                duplicate: true,

                verificationRequired: true,

                verificationSessions:
                    result.verificationSessions,

                expiresAt:
                    result.expiresAt,

                message:
                    "A similar application already exists."
            });
        }

        res.status(201).json({
            success: true,
            application: result
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

}

export async function getApplicationById(req, res) {
    const applicationId = req.params.applicationId;

    if (!applicationId) {
        return res.status(400).json({
            success: false,
            message: "Application ID is required."
        });
    }

    try {
        const result = await getApplicationByIdService(applicationId);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Application not found."
            });
        }

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Get application error:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to retrieve application."
        });
    }
}

export async function updateApplication(req, res) {

    const applicationId = req.params.applicationId;

    try {

        const payload = JSON.parse(req.body.payload);

        const result = await updateApplicationService(
            applicationId,
            payload,
            req.files
        );

        return res.status(200).json({
            success: true,
            application: result
        });

    } catch (error) {

        console.error("Update application:", error);

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to update application."
        });

    }

}

export async function submitIdRequest(req, res) {
    const applicationId =
        req.params.applicationId;

    try {
        const payload =
            JSON.parse(req.body.payload);

        const result =
            await submitIdRequestService(
                applicationId,
                payload,
                req.files
            );

        return res.status(201).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error(
            "Submit ID request error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Unable to submit ID request."
        });
    }
}

export async function verifyDuplicateApplicant(
  req,
  res
) {
  try {
    const {
      sessionId,
      surname,
      firstName,
      middleName,
      dateOfBirth
    } = req.body;

    if (
      !sessionId ||
      !surname ||
      !firstName ||
      !dateOfBirth
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Required verification information is missing."
      });
    }

    const result =
      await verifyDuplicateIdentityService(
        sessionId,
        surname,
        firstName,
        middleName || "",
        dateOfBirth
      );

    if (!result.verified) {
      let message =
        "Identity verification failed.";

      if (result.reason === "expired") {
        message =
          "Your verification session has expired. Please submit the form again.";
      }

      return res.status(403).json({
        success: false,
        verified: false,
        reason: result.reason,
        message
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      purpose: result.purpose
    });

  } catch (error) {
    console.error(
      "Duplicate identity verification error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify your identity right now."
    });
  }
}

export async function getVerifiedDuplicateRecord(
    req,
    res
) {
    try {
        const sessionId =
            req.params.sessionId;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message:
                    "Verification session is required."
            });
        }

        const data =
            await getVerifiedDuplicateApplicationService(
                sessionId
            );

        return res.status(200).json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error(
            "Get verified duplicate record error:",
            error
        );

        return res.status(403).json({
            success: false,
            message:
                error.message ||
                "Unable to access the existing record."
        });
    }
}

export async function updateVerifiedDuplicateRecord(
    req,
    res
) {
    try {
        const sessionId =
            req.params.sessionId;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message:
                    "Verification session is required."
            });
        }

        const payload =
            JSON.parse(req.body.payload);

        const result =
            await updateVerifiedDuplicateApplicationService(
                sessionId,
                payload,
                req.files
            );

        return res.status(200).json({
            success: true,

            application:
                result.application,

            applicationId:
                result.applicationId,

            idRequest:
                result.idRequest
        });

    } catch (error) {
        console.error(
            "Update verified duplicate record error:",
            error
        );

        return res.status(403).json({
            success: false,
            message:
                error.message ||
                "Unable to update the existing record."
        });
    }
}

export async function recoverApplicationId(
    req,
    res
) {
    try {
        const sessionId =
            req.params.sessionId;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message:
                    "Verification session is required."
            });
        }

        const result =
            await recoverVerifiedApplicationIdService(
                sessionId
            );

        return res.status(200).json({
            success: true,
            applicationId:
                result.applicationId
        });

    } catch (error) {
        console.error(
            "Recover Application ID error:",
            error
        );

        return res.status(403).json({
            success: false,
            message:
                error.message ||
                "Unable to recover the Application ID."
        });
    }
}

// =====================================================
// UPDATE DOCUMENT AUTHENTICATION
// =====================================================

export async function updateDocumentAuthentication(
    req,
    res
) {

    try {

        const applicationId =
            req.params.applicationId;


        const {
            documentType,
            authenticationStatus,
            authenticationMethod,
            authenticationRemarks
        } = req.body;


        if (!applicationId) {

            return res.status(
                400
            ).json({
                success: false,
                message:
                    "Application ID is required."
            });
        }

        if (!documentType) {

            return res.status(
                400
            ).json({
                success: false,
                message:
                    "Document type is required."
            });
        }

        if (!authenticationStatus) {

            return res.status(
                400
            ).json({
                success: false,
                message:
                    "Authentication status is required."
            });
        }


        /*
         * We'll connect this to the logged-in
         * staff account later.
         *
         * For now, keep it null rather than
         * accepting an arbitrary user ID
         * from the browser.
         */
        const authenticatedBy =
            req.user?.id || null;


        const result =
            await updateDocumentAuthenticationService({

                applicationId,

                documentType,

                authenticationStatus,

                authenticationMethod:
                    authenticationMethod || null,

                authenticatedBy,

                authenticationRemarks:
                    authenticationRemarks || null
            });


        return res.status(
            200
        ).json({

            success: true,

            data:
                result,

            message:
                "Document authentication updated successfully."
        });


    } catch (error) {

        console.error(
            "Update document authentication error:",
            error
        );


        return res.status(
            500
        ).json({

            success: false,

            message:
                error.message ||
                "Unable to update document authentication."
        });
    }
}

export async function listStaffApplications(req, res) {
    try {
        const { data: applications, error } = await supabase
            .from("applications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1000);
        if (error) throw error;
        const ids = (applications || []).map(row => row.application_id).filter(Boolean);
        if (!ids.length) return res.status(200).json({ success: true, data: [] });

        const [{ data: history, error: historyError }, { data: auth, error: authError }] = await Promise.all([
            supabase.from("application_status_history").select("application_id, status, updated_at").in("application_id", ids).order("updated_at", { ascending: false }),
            supabase.from("document_authentications").select("application_id, authentication_status").in("application_id", ids)
        ]);
        if (historyError) throw historyError;
        if (authError) throw authError;

        const latestStatus = new Map();
        for (const row of history || []) if (!latestStatus.has(row.application_id)) latestStatus.set(row.application_id, row.status);
        const authSummary = new Map();
        for (const row of auth || []) {
            const current = authSummary.get(row.application_id) || { authenticated: 0 };
            if (String(row.authentication_status || "").toLowerCase() === "authenticated") current.authenticated += 1;
            authSummary.set(row.application_id, current);
        }
        const data = (applications || []).map(row => {
            const authenticated = (authSummary.get(row.application_id) || { authenticated: 0 }).authenticated;
            return { ...row, status: latestStatus.get(row.application_id) || row.application_status || "Pending", authenticated_documents: authenticated, required_documents: 3, pending_documents: Math.max(3 - authenticated, 0) };
        });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("List staff applications error:", error);
        return res.status(500).json({ success: false, message: "Unable to list applications." });
    }
}

export async function getStaffApplicationDetail(req, res) {
    const applicationId = String(req.params.applicationId || "").trim();
    if (!applicationId) return res.status(400).json({ success: false, message: "Application ID is required." });
    try {
        const result = await getApplicationByIdService(applicationId);
        if (!result) return res.status(404).json({ success: false, message: "Application not found." });
        const [{ data: history, error: historyError }, { data: idRequests, error: idRequestError }] = await Promise.all([
            supabase.from("application_status_history").select("status, updated_at").eq("application_id", applicationId).order("updated_at", { ascending: false }),
            supabase.from("id_requests").select("*").eq("application_id", applicationId).order("requested_at", { ascending: false })
        ]);
        if (historyError) throw historyError;
        if (idRequestError) throw idRequestError;
        return res.status(200).json({ success: true, data: { ...result, statusHistory: history || [], idRequests: idRequests || [] } });
    } catch (error) {
        console.error("Get staff application detail error:", error);
        return res.status(500).json({ success: false, message: "Unable to retrieve application detail." });
    }
}

export async function updateStaffApplicationStatus(req, res) {
    const applicationId = String(req.params.applicationId || "").trim();
    const status = String(req.body?.status || "").trim();
    const allowedStatuses = ["Pending", "Under Review", "In Process", "Ready for Release", "Completed", "Rejected"];
    if (!applicationId) return res.status(400).json({ success: false, message: "Application ID is required." });
    if (!allowedStatuses.includes(status)) return res.status(400).json({ success: false, message: "Invalid application status." });
    try {
        const { data: application, error: applicationError } = await supabase.from("applications").select("application_id").eq("application_id", applicationId).maybeSingle();
        if (applicationError) throw applicationError;
        if (!application) return res.status(404).json({ success: false, message: "Application not found." });
        const { data: inserted, error: historyError } = await supabase.from("application_status_history")
            .insert([{ application_id: applicationId, status, updated_at: new Date().toISOString() }])
            .select().single();
        if (historyError) throw historyError;
        return res.status(200).json({ success: true, data: inserted, message: "Application status updated successfully." });
    } catch (error) {
        console.error("Update staff application status error:", error);
        return res.status(500).json({ success: false, message: "Unable to update application status. Check the status-history schema." });
    }
}
