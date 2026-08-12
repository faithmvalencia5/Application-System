import { supabase } from "../supabase.js";
import {
    registerApplication as registerApplicationService,
    getApplicationById as getApplicationByIdService,
    updateApplication as updateApplicationService,
    submitIdRequest as submitIdRequestService,
    createDuplicateVerificationSession,
    verifyDuplicateIdentity,
    getVerifiedDuplicateApplication as getVerifiedDuplicateApplicationService
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
      await verifyDuplicateIdentity(
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