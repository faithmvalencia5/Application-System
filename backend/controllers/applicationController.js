import { supabase } from "../supabase.js";
import {
    registerApplication as registerApplicationService,
    getApplicationById as getApplicationByIdService,
    updateApplication as updateApplicationService
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