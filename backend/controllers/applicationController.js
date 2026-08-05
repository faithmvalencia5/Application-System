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

        // fetch related tables
        const [{ data: familyRows }, { data: memberships }, { data: personalBackground }, { data: problemsNeeds }, { data: applicationFiles }, { data: confirmations }] = await Promise.all([
            supabase.from('family_composition').select('*').eq('application_id', applicationId),
            supabase.from('memberships').select('*').eq('application_id', applicationId),
            supabase.from('personal_background').select('*').eq('application_id', applicationId),
            supabase.from('problems_needs').select('*').eq('application_id', applicationId),
            supabase.from('application_files').select('*').eq('application_id', applicationId),
            supabase.from('confirmations').select('*').eq('application_id', applicationId)
        ]);

        return res.status(200).json({
            success: true,
            application: applicationRow,
            family: familyRows || [],
            memberships: (memberships && memberships[0]) || null,
            personal_background: (personalBackground && personalBackground[0]) || null,
            problems_needs: (problemsNeeds && problemsNeeds[0]) || null,
            application_files: (applicationFiles && applicationFiles[0]) || null,
            confirmations: (confirmations && confirmations[0]) || null
        });
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
        // support both JSON body and multipart form with `payload` field
        let payload = null;
        if (req.body && req.body.payload) {
            try {
                payload = JSON.parse(req.body.payload);
            } catch (e) {
                payload = req.body.payload;
            }
        } else if (req.body && Object.keys(req.body).length > 0) {
            payload = req.body;
        } else {
            payload = {};
        }

        const files = req.files || {};

        // fetch existing application to preserve fields we don't update
        const { data: existingApp, error: fetchError } = await supabase
            .from('applications')
            .select('*')
            .eq('application_id', applicationId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existingApp) return res.status(404).json({ success: false, message: 'Application not found.' });

        const {
            applicationsData,
            familyRowsData,
            membershipsData,
            personalBackgroundData,
            problemsNeedsData,
            applicationFilesData,
            confirmationsData
        } = payload || {};

        // Update applications table (safe fields)
        if (applicationsData && Object.keys(applicationsData).length > 0) {
            const { data: updatedApp, error: updateError } = await supabase
                .from('applications')
                .update(applicationsData)
                .eq('application_id', applicationId)
                .select()
                .single();

            if (updateError) throw updateError;
        }

        // FAMILY COMPOSITION: replace rows
        if (Array.isArray(familyRowsData)) {
            const { error: delError } = await supabase.from('family_composition').delete().eq('application_id', applicationId);
            if (delError) throw delError;

            if (familyRowsData.length > 0) {
                const toInsert = familyRowsData.map(r => ({ ...r, application_id: applicationId }));
                const { error: insertError } = await supabase.from('family_composition').insert(toInsert);
                if (insertError) throw insertError;
            }
        }

        // MEMBERSHIPS: replace
        if (membershipsData) {
            await supabase.from('memberships').delete().eq('application_id', applicationId);
            const hasMembership = Object.values(membershipsData).some(v => v !== null && v !== undefined && v !== '');
            if (hasMembership) {
                const { error: memError } = await supabase.from('memberships').insert([{ ...membershipsData, application_id: applicationId }]);
                if (memError) throw memError;
            }
        }

        // PERSONAL BACKGROUND
        if (personalBackgroundData) {
            await supabase.from('personal_background').delete().eq('application_id', applicationId);
            const { error: pbError } = await supabase.from('personal_background').insert([{ ...personalBackgroundData, application_id: applicationId }]);
            if (pbError) throw pbError;
        }

        // PROBLEMS & NEEDS
        if (problemsNeedsData) {
            await supabase.from('problems_needs').delete().eq('application_id', applicationId);
            const { error: pnError } = await supabase.from('problems_needs').insert([{ ...problemsNeedsData, application_id: applicationId }]);
            if (pnError) throw pnError;
        }

        // APPLICATION FILES: if new files uploaded, store and update paths; otherwise update metadata
        if (applicationFilesData || Object.keys(files).length > 0) {
            // get existing file record if any
            const { data: existingFiles } = await supabase.from('application_files').select('*').eq('application_id', applicationId).maybeSingle();

            // upload new files and set paths
            const { uploadFile } = await import('../services/storageService.js');

            const filePaths = {};
            if (files.valid_id_front && files.valid_id_front[0]) {
                const p = await uploadFile(applicationId, files.valid_id_front[0], 'valid_id_front');
                filePaths.valid_id_url = p;
            }
            if (files.valid_id_back && files.valid_id_back[0]) {
                const p = await uploadFile(applicationId, files.valid_id_back[0], 'valid_id_back');
                filePaths.valid_id_back_url = p;
            }
            if (files.latest_photo && files.latest_photo[0]) {
                const p = await uploadFile(applicationId, files.latest_photo[0], 'latest_photo');
                filePaths.latest_photo_url = p;
            }
            if (files.birth_certificate && files.birth_certificate[0]) {
                const p = await uploadFile(applicationId, files.birth_certificate[0], 'birth_certificate');
                filePaths.birth_certificate_url = p;
            }
            if (files.community_tax_certificate && files.community_tax_certificate[0]) {
                const p = await uploadFile(applicationId, files.community_tax_certificate[0], 'community_tax_certificate');
                filePaths.community_tax_certificate_url = p;
            }
            if (files.signature && files.signature[0]) {
                const p = await uploadFile(applicationId, files.signature[0], 'signature');
                filePaths.signature_url = p;
            }

            // build final files row
            const filesRow = {
                application_id: applicationId,
                application_date: applicationFilesData ? applicationFilesData.application_date : (existingFiles ? existingFiles.application_date : null),
                valid_id_url: filePaths.valid_id_url || (existingFiles ? existingFiles.valid_id_url : null),
                valid_id_back_url: filePaths.valid_id_back_url || (existingFiles ? existingFiles.valid_id_back_url : null),
                latest_photo_url: filePaths.latest_photo_url || (existingFiles ? existingFiles.latest_photo_url : null),
                birth_certificate_url: filePaths.birth_certificate_url || (existingFiles ? existingFiles.birth_certificate_url : null),
                community_tax_certificate_url: filePaths.community_tax_certificate_url || (existingFiles ? existingFiles.community_tax_certificate_url : null),
                signature_url: filePaths.signature_url || (existingFiles ? existingFiles.signature_url : null)
            };

            // delete existing and insert new
            await supabase.from('application_files').delete().eq('application_id', applicationId);
            const { error: filesInsErr } = await supabase.from('application_files').insert([filesRow]);
            if (filesInsErr) throw filesInsErr;
        }

        // CONFIRMATIONS
        if (confirmationsData) {
            await supabase.from('confirmations').delete().eq('application_id', applicationId);
            const { error: confErr } = await supabase.from('confirmations').insert([{ ...confirmationsData, application_id: applicationId }]);
            if (confErr) throw confErr;
        }

        // Return updated application
        const { data: finalApp, error: finalErr } = await supabase.from('applications').select('*').eq('application_id', applicationId).maybeSingle();
        if (finalErr) throw finalErr;

        return res.status(200).json({ success: true, application: finalApp });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message || 'Unable to update application.' });
    }
}