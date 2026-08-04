import { supabase } from "../supabase.js";
import { uploadFile } from "./storageService.js";

export async function registerApplication(payload, files) {

    const {
        applicationsData,
        familyRowsData,
        membershipsData,
        personalBackgroundData,
        problemsNeedsData,
        applicationFilesData,
        confirmationsData,
        statusHistoryData
    } = payload;

    let applicationId = null;

    try {

        // TABLE 1: APPLICATIONS
        const { data: application, error: applicationError } = await supabase
            .from("applications")
            .insert([applicationsData])
            .select()
            .single();

        if (applicationError) {
            throw applicationError;
        }

        applicationId = application.application_id;

        const validIdPath = await uploadFile(
            applicationId,
            files?.valid_id?.[0],
            "valid_id"
        );

        const latestPhotoPath = await uploadFile(
            applicationId,
            files?.latest_photo?.[0],
            "latest_photo"
        );

        const birthCertificatePath = await uploadFile(
            applicationId,
            files?.birth_certificate?.[0],
            "birth_certificate"
        );

        const communityTaxPath = await uploadFile(
            applicationId,
            files?.community_tax_certificate?.[0],
            "community_tax_certificate"
        );

        const signaturePath = await uploadFile(
            applicationId,
            files?.signature?.[0],
            "signature"
        );

        // TABLE 2: FAMILY COMPOSITION
        if (familyRowsData && familyRowsData.length > 0) {

            const familyData = familyRowsData.map(member => ({
                ...member,
                application_id: applicationId
            }));

            const { error: familyError } = await supabase
                .from("family_composition")
                .insert(familyData);

            if (familyError) {
                throw familyError;
            }
        }

        // TABLE 3: MEMBERSHIPS
        if (
            membershipsData &&
            (
                membershipsData.association_name ||
                membershipsData.association_address ||
                membershipsData.association_date ||
                membershipsData.position
            )
        ) {

            const membershipData = {
                ...membershipsData,
                application_id: applicationId
            };

            const { error: membershipError } = await supabase
                .from("memberships")
                .insert([membershipData]);

            if (membershipError) {
                throw membershipError;
            }
        }

        // TABLE 4: PERSONAL BACKGROUND
        if (personalBackgroundData) {

            const { error: personalBackgroundError } = await supabase
                .from("personal_background")
                .insert([{
                    ...personalBackgroundData,
                    application_id: applicationId
                }]);

            if (personalBackgroundError) {
                throw personalBackgroundError;
            }
        }

        // TABLE 5: PROBLEMS & NEEDS
        if (problemsNeedsData) {

            const { error: problemsNeedsError } = await supabase
                .from("problems_needs")
                .insert([{
                    ...problemsNeedsData,
                    application_id: applicationId
                }]);

            if (problemsNeedsError) {
                throw problemsNeedsError;
            }
        }

        // TABLE 6: APPLICATION FILES
        if (applicationFilesData) {

            const { error: filesError } = await supabase
                .from("application_files")
                .insert([{
                    ...applicationFilesData,
                    application_id: applicationId,

                    valid_id_url: validIdPath,
                    latest_photo_url: latestPhotoPath,
                    birth_certificate_url: birthCertificatePath,
                    community_tax_certificate_url: communityTaxPath,
                    signature_url: signaturePath
                }]);

            if (filesError) {
                throw filesError;
            }
        }

        // TABLE 7: CONFIRMATIONS
        if (confirmationsData) {

            const { error: confirmationError } = await supabase
                .from("confirmations")
                .insert([{
                    ...confirmationsData,
                    application_id: applicationId
                }]);

            if (confirmationError) {
                throw confirmationError;
            }
        }

        // TABLE 8: STATUS HISTORY
        if (statusHistoryData) {

            const { error: statusError } = await supabase
                .from("application_status_history")
                .insert([{
                    ...statusHistoryData,
                    application_id: applicationId
                }]);

            if (statusError) {
                throw statusError;
            }
        }

        // Everything was successful
        return application;

    } catch (error) {
        // Manual rollback
        if (applicationId) {
            await supabase
                .from("applications")
                .delete()
                .eq("application_id", applicationId);
        }

        throw error;
    }
}