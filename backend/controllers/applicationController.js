import { supabase } from "../supabase.js";
import { registerApplication as registerApplicationService } from "../services/applicationService.js";

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

export async function getApplication(req, res) {
    const applicationId = req.params.applicationId;

    if (!applicationId) {
        return res.status(400).json({ success: false, message: "Application ID is required." });
    }

    try {
        const { data: applicationRow, error } = await supabase
            .from('applications')
            .select('*')
            .eq('application_id', applicationId)
            .maybeSingle();

        if (error) throw error;

        if (!applicationRow) {
            return res.status(404).json({ success: false, message: 'Application not found.' });
        }

        return res.status(200).json({ success: true, application: applicationRow });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || 'Unable to fetch application.' });
    }
}

export async function updateApplication(req, res) {
    const applicationId = req.params.applicationId;

    if (!applicationId) {
        return res.status(400).json({ success: false, message: "Application ID is required." });
    }

    try {
        const updates = req.body || {};

        // Only allow updating a safe subset of fields for now
        const allowed = [
            'surname','first_name','middle_name','date_of_birth','age','sex','place_of_birth','civil_status',
            'house_street','barangay_district','educational_attainment','religion','occupation','contact_number'
        ];

        const payload = {};
        allowed.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(updates, key)) {
                payload[key] = updates[key];
            }
        });

        const { data, error } = await supabase
            .from('applications')
            .update(payload)
            .eq('application_id', applicationId)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, application: data });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || 'Unable to update application.' });
    }
}