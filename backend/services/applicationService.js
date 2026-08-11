import { supabase } from "../supabase.js";
import { uploadFile } from "./storageService.js";

async function createSignedFileUrl(filePath) {
    if (!filePath) {
        return null;
    }

    const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(filePath, 60 * 30);

    if (error) {
        console.error(
            "Unable to create signed URL for:",
            filePath,
            error
        );

        return null;
    }

    return data?.signedUrl || null;
}

async function deleteStorageFile(filePath) {
    if (!filePath) {
        return;
    }

    const { error } = await supabase.storage
        .from("documents")
        .remove([filePath]);

    if (error) {
        console.error(
            "Unable to delete replaced file:",
            filePath,
            error
        );
    }
}
async function findDuplicateApplicant(applicationsData) {

    const { data, error } = await supabase
        .from("applications")
        .select(`
            application_id,
            surname,
            first_name,
            middle_name,
            date_of_birth,
            barangay_district
        `)
        .eq("surname", applicationsData.surname)
        .eq("first_name", applicationsData.first_name)
        .eq("date_of_birth", applicationsData.date_of_birth)
        .eq("barangay_district", applicationsData.barangay_district)
        .limit(1);

    if (error) {
        throw error;
    }

    return data.length > 0 ? data[0] : null;
}

export async function createDuplicateVerificationSession(
    applicationId,
    purpose
) {
    const allowedPurposes = [
        "update_existing",
        "recover_application_id"
    ];

    if (!allowedPurposes.includes(purpose)) {
        throw new Error(
            "Invalid duplicate verification purpose."
        );
    }

    const {
        data,
        error
    } = await supabase
        .from("duplicate_verification_sessions")
        .insert([
            {
                application_id: applicationId,
                purpose: purpose
            }
        ])
        .select("id, expires_at")
        .single();

    if (error) {
        throw error;
    }

    return data;
}

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
        const duplicate = await findDuplicateApplicant(applicationsData);

        if (duplicate) {

            const [
                updateSession,
                recoverSession
            ] = await Promise.all([
                createDuplicateVerificationSession(
                    duplicate.application_id,
                    "update_existing"
                ),

                createDuplicateVerificationSession(
                    duplicate.application_id,
                    "recover_application_id"
                )
            ]);

            return {
                duplicate: true,

                verificationSessions: {
                    updateExisting:
                        updateSession.id,

                    recoverApplicationId:
                        recoverSession.id
                },

                expiresAt:
                    updateSession.expires_at
            };
        }

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

        const [
            validIdFrontPath,
            validIdBackPath,
            latestPhotoPath,
            birthCertificatePath,
            communityTaxPath,
            signaturePath
        ] = await Promise.all([
            uploadFile(
                applicationId,
                files?.valid_id_front?.[0],
                "valid_id_front"
            ),

            uploadFile(
                applicationId,
                files?.valid_id_back?.[0],
                "valid_id_back"
            ),

            uploadFile(
                applicationId,
                files?.latest_photo?.[0],
                "latest_photo"
            ),

            uploadFile(
                applicationId,
                files?.birth_certificate?.[0],
                "birth_certificate"
            ),

            uploadFile(
                applicationId,
                files?.community_tax_certificate?.[0],
                "community_tax_certificate"
            ),

            uploadFile(
                applicationId,
                files?.signature?.[0],
                "signature"
            )
        ]);

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

                    valid_id_url: validIdFrontPath,
                    valid_id_back_url: validIdBackPath,
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

export async function getApplicationById(applicationId) {
    const [
        applicationResult,
        familyResult,
        membershipResult,
        personalBackgroundResult,
        problemsNeedsResult,
        applicationFilesResult,
        confirmationsResult
    ] = await Promise.all([
        supabase
            .from("applications")
            .select("*")
            .eq("application_id", applicationId)
            .maybeSingle(),

        supabase
            .from("family_composition")
            .select("*")
            .eq("application_id", applicationId)
            .order("id", { ascending: true }),

        supabase
            .from("memberships")
            .select("*")
            .eq("application_id", applicationId)
            .maybeSingle(),

        supabase
            .from("personal_background")
            .select("*")
            .eq("application_id", applicationId)
            .maybeSingle(),

        supabase
            .from("problems_needs")
            .select("*")
            .eq("application_id", applicationId)
            .maybeSingle(),

        supabase
            .from("application_files")
            .select("*")
            .eq("application_id", applicationId)
            .maybeSingle(),

        supabase
            .from("confirmations")
            .select("*")
            .eq("application_id", applicationId)
            .maybeSingle()
    ]);

    const errors = [
        applicationResult.error,
        familyResult.error,
        membershipResult.error,
        personalBackgroundResult.error,
        problemsNeedsResult.error,
        applicationFilesResult.error,
        confirmationsResult.error
    ].filter(Boolean);

    if (errors.length > 0) {
        throw errors[0];
    }

    if (!applicationResult.data) {
        return null;
    }

    const applicationFiles =
        applicationFilesResult.data || null;

    let filesWithSignedUrls = null;

    if (applicationFiles) {
        const [
            validIdFrontSignedUrl,
            validIdBackSignedUrl,
            latestPhotoSignedUrl,
            birthCertificateSignedUrl,
            communityTaxSignedUrl,
            signatureSignedUrl
        ] = await Promise.all([
            createSignedFileUrl(
                applicationFiles.valid_id_url
            ),

            createSignedFileUrl(
                applicationFiles.valid_id_back_url
            ),

            createSignedFileUrl(
                applicationFiles.latest_photo_url
            ),

            createSignedFileUrl(
                applicationFiles.birth_certificate_url
            ),

            createSignedFileUrl(
                applicationFiles.community_tax_certificate_url
            ),

            createSignedFileUrl(
                applicationFiles.signature_url
            )
        ]);

        filesWithSignedUrls = {
            ...applicationFiles,

            valid_id_signed_url:
                validIdFrontSignedUrl,

            valid_id_back_signed_url:
                validIdBackSignedUrl,

            latest_photo_signed_url:
                latestPhotoSignedUrl,

            birth_certificate_signed_url:
                birthCertificateSignedUrl,

            community_tax_certificate_signed_url:
                communityTaxSignedUrl,

            signature_signed_url:
                signatureSignedUrl
        };
    }

    return {
        application: applicationResult.data,
        familyComposition: familyResult.data || [],
        membership: membershipResult.data || null,
        personalBackground:
            personalBackgroundResult.data || null,
        problemsNeeds:
            problemsNeedsResult.data || null,
        applicationFiles:
            filesWithSignedUrls,
        confirmations:
            confirmationsResult.data || null
    };
}

export async function updateApplication(
    applicationId,
    payload,
    files,
    allowedStatuses = ["pending"]
) {
    const {
        applicationsData,
        familyRowsData,
        membershipsData,
        personalBackgroundData,
        problemsNeedsData,
        applicationFilesData,
        confirmationsData
    } = payload;

    if (!applicationId) {
        throw new Error("Application ID is required.");
    }

    /*
     * Confirm that the application exists and is still Pending.
     * The frontend button is not enough protection because someone
     * could manually call the API.
     */
    const {
        data: existingApplication,
        error: existingApplicationError
    } = await supabase
        .from("applications")
        .select("application_id")
        .eq("application_id", applicationId)
        .maybeSingle();

    if (existingApplicationError) {
        throw existingApplicationError;
    }

    if (!existingApplication) {
        throw new Error("Application not found.");
    }

    const {
        data: latestStatusRows,
        error: latestStatusError
    } = await supabase
        .from("application_status_history")
        .select("status, updated_at")
        .eq("application_id", applicationId)
        .order("updated_at", { ascending: false })
        .limit(1);

    if (latestStatusError) {
        throw latestStatusError;
    }

    const latestStatus =
        latestStatusRows &&
        latestStatusRows.length > 0
            ? latestStatusRows[0].status
            : null;

    const currentStatus = String(
        latestStatus ||
        ""
    )
        .trim()
        .toLowerCase();

    if (!allowedStatuses.includes(currentStatus)) {
        throw new Error(
            "This application cannot be edited in its current status."
        );
    }

    /*
     * Retrieve the existing file paths.
     * These paths must remain unchanged unless the applicant selects
     * replacement files.
     */
    const {
        data: existingApplicationFiles,
        error: existingFilesError
    } = await supabase
        .from("application_files")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle();

    if (existingFilesError) {
        throw existingFilesError;
    }

    /*
     * Upload only newly selected replacement files.
     * uploadFile() returns null when no new file was selected.
     */
    const [
        newValidIdFrontPath,
        newValidIdBackPath,
        newLatestPhotoPath,
        newBirthCertificatePath,
        newCommunityTaxPath,
        newSignaturePath
    ] = await Promise.all([
        uploadFile(
            applicationId,
            files?.valid_id_front?.[0],
            "valid_id_front"
        ),

        uploadFile(
            applicationId,
            files?.valid_id_back?.[0],
            "valid_id_back"
        ),

        uploadFile(
            applicationId,
            files?.latest_photo?.[0],
            "latest_photo"
        ),

        uploadFile(
            applicationId,
            files?.birth_certificate?.[0],
            "birth_certificate"
        ),

        uploadFile(
            applicationId,
            files?.community_tax_certificate?.[0],
            "community_tax_certificate"
        ),

        uploadFile(
            applicationId,
            files?.signature?.[0],
            "signature"
        )
    ]);

    /*
     * TABLE 1: APPLICATIONS
     *
     * Do not allow the form payload to change application_id or
     * application_status. The application must remain Pending.
     */
    if (applicationsData) {
        const safeApplicationsData = {
            ...applicationsData
        };

        delete safeApplicationsData.application_id;
        delete safeApplicationsData.application_status;

        const {
            data: updatedApplication,
            error: applicationError
        } = await supabase
            .from("applications")
            .update(safeApplicationsData)
            .eq("application_id", applicationId)
            .select()
            .single();

        if (applicationError) {
            throw applicationError;
        }

        /*
         * TABLE 2: FAMILY COMPOSITION
         *
         * Delete the old rows and insert the current rows from the form.
         * This supports adding, editing, and removing family members.
         */
        const { error: deleteFamilyError } = await supabase
            .from("family_composition")
            .delete()
            .eq("application_id", applicationId);

        if (deleteFamilyError) {
            throw deleteFamilyError;
        }

        if (
            Array.isArray(familyRowsData) &&
            familyRowsData.length > 0
        ) {
            const familyData = familyRowsData.map(function (member) {
                const cleanMember = {
                    ...member,
                    application_id: applicationId
                };

                /*
                 * Remove any old primary key returned by the GET endpoint.
                 * Supabase should generate a fresh row ID.
                 */
                delete cleanMember.id;

                return cleanMember;
            });

            const { error: insertFamilyError } = await supabase
                .from("family_composition")
                .insert(familyData);

            if (insertFamilyError) {
                throw insertFamilyError;
            }
        }

        /*
         * TABLE 3: MEMBERSHIPS
         *
         * If every membership field is empty, remove the existing
         * membership record. Otherwise, update or create it.
         */
        const hasMembershipData =
            membershipsData &&
            (
                membershipsData.association_name ||
                membershipsData.association_address ||
                membershipsData.association_date ||
                membershipsData.position
            );

        if (hasMembershipData) {
            const membershipRecord = {
                ...membershipsData,
                application_id: applicationId
            };

            delete membershipRecord.id;

            const { error: membershipError } = await supabase
                .from("memberships")
                .upsert(
                    [membershipRecord],
                    {
                        onConflict: "application_id"
                    }
                );

            if (membershipError) {
                throw membershipError;
            }
        } else {
            const { error: deleteMembershipError } = await supabase
                .from("memberships")
                .delete()
                .eq("application_id", applicationId);

            if (deleteMembershipError) {
                throw deleteMembershipError;
            }
        }

        /*
         * TABLE 4: PERSONAL BACKGROUND
         */
        if (personalBackgroundData) {
            const personalBackgroundRecord = {
                ...personalBackgroundData,
                application_id: applicationId
            };

            delete personalBackgroundRecord.id;

            const { error: personalBackgroundError } =
                await supabase
                    .from("personal_background")
                    .upsert(
                        [personalBackgroundRecord],
                        {
                            onConflict: "application_id"
                        }
                    );

            if (personalBackgroundError) {
                throw personalBackgroundError;
            }
        }

        /*
         * TABLE 5: PROBLEMS AND NEEDS
         */
        if (problemsNeedsData) {
            const problemsNeedsRecord = {
                ...problemsNeedsData,
                application_id: applicationId
            };

            delete problemsNeedsRecord.id;

            const { error: problemsNeedsError } =
                await supabase
                    .from("problems_needs")
                    .upsert(
                        [problemsNeedsRecord],
                        {
                            onConflict: "application_id"
                        }
                    );

            if (problemsNeedsError) {
                throw problemsNeedsError;
            }
        }

        /*
         * TABLE 6: APPLICATION FILES
         *
         * Preserve each old file path unless a new replacement file
         * was successfully uploaded.
         */
        const updatedFilesRecord = {
            application_id: applicationId,

            valid_id_url:
                newValidIdFrontPath ||
                existingApplicationFiles?.valid_id_url ||
                null,

            valid_id_back_url:
                newValidIdBackPath ||
                existingApplicationFiles?.valid_id_back_url ||
                null,

            latest_photo_url:
                newLatestPhotoPath ||
                existingApplicationFiles?.latest_photo_url ||
                null,

            birth_certificate_url:
                newBirthCertificatePath ||
                existingApplicationFiles?.birth_certificate_url ||
                null,

            community_tax_certificate_url:
                newCommunityTaxPath ||
                existingApplicationFiles
                    ?.community_tax_certificate_url ||
                null,

            signature_url:
                newSignaturePath ||
                existingApplicationFiles?.signature_url ||
                null,

            application_date:
                applicationFilesData?.application_date ||
                existingApplicationFiles?.application_date ||
                null
        };

        const { error: applicationFilesError } = await supabase
            .from("application_files")
            .upsert(
                [updatedFilesRecord],
                {
                    onConflict: "application_id"
                }
            );

        if (applicationFilesError) {
            throw applicationFilesError;
        }

        /*
         * TABLE 7: CONFIRMATIONS
         */
        if (confirmationsData) {
            const confirmationsRecord = {
                ...confirmationsData,
                application_id: applicationId
            };

            delete confirmationsRecord.id;

            const { error: confirmationsError } =
                await supabase
                    .from("confirmations")
                    .upsert(
                        [confirmationsRecord],
                        {
                            onConflict: "application_id"
                        }
                    );

            if (confirmationsError) {
                throw confirmationsError;
            }
        }

        /*
        * Delete old storage files only after all database
        * updates have completed successfully.
        */
        const filesToDelete = [];

        if (
            newValidIdFrontPath &&
            existingApplicationFiles?.valid_id_url
        ) {
            filesToDelete.push(
                existingApplicationFiles.valid_id_url
            );
        }

        if (
            newValidIdBackPath &&
            existingApplicationFiles?.valid_id_back_url
        ) {
            filesToDelete.push(
                existingApplicationFiles.valid_id_back_url
            );
        }

        if (
            newLatestPhotoPath &&
            existingApplicationFiles?.latest_photo_url
        ) {
            filesToDelete.push(
                existingApplicationFiles.latest_photo_url
            );
        }

        if (
            newBirthCertificatePath &&
            existingApplicationFiles?.birth_certificate_url
        ) {
            filesToDelete.push(
                existingApplicationFiles.birth_certificate_url
            );
        }

        if (
            newCommunityTaxPath &&
            existingApplicationFiles
                ?.community_tax_certificate_url
        ) {
            filesToDelete.push(
                existingApplicationFiles
                    .community_tax_certificate_url
            );
        }

        if (
            newSignaturePath &&
            existingApplicationFiles?.signature_url
        ) {
            filesToDelete.push(
                existingApplicationFiles.signature_url
            );
        }

        await Promise.all(
            filesToDelete.map(function (filePath) {
                return deleteStorageFile(filePath);
            })
        );

        /*
        * Editing information does not change the status.
        */
        return updatedApplication;
    }

    throw new Error("Application data is missing.");
}

export async function submitIdRequest(
    applicationId,
    requestData,
    files
) {
    const {
        applicationChanges,
        reason,
        otherReason
    } = requestData;

    if (!applicationId) {
        throw new Error("Application ID is required.");
    }

    const normalizedReason =
        String(reason || "").trim();

    const allowedReasons = [
        "Lost",
        "Damage",
        "Change Address",
        "Other"
    ];

    if (!allowedReasons.includes(normalizedReason)) {
        throw new Error(
            "Please select a valid ID request reason."
        );
    }

    if (
        normalizedReason === "Other" &&
        !String(otherReason || "").trim()
    ) {
        throw new Error(
            "Please specify the reason for your ID request."
        );
    }

    // Verify the application is Completed.
    // Use the same status logic as the Track Status page.

    const {
        data: application,
        error: applicationError
    } = await supabase
        .from("applications")
        .select("application_id")
        .eq("application_id", applicationId)
        .maybeSingle();

    if (applicationError) {
        throw applicationError;
    }

    if (!application) {
        throw new Error("Application not found.");
    }


    // Get the latest status-history record
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
        statusHistoryRows &&
        statusHistoryRows.length > 0
            ? statusHistoryRows[0].status
            : null;


    // Same rule used by Track Status:
    // latest status history first,
    // applications.application_status second.
    const currentStatus =
        String(
            latestStatus ||
            "Pending"
        )
            .trim()
            .toLowerCase();

    if (currentStatus !== "completed") {
        throw new Error(
            "An ID request can only be submitted for a Completed application."
        );
    }

    // Prevent duplicate active requests
    const {
        data: existingRequest,
        error: existingRequestError
    } = await supabase
        .from("id_requests")
        .select("id, request_status")
        .eq("application_id", applicationId)
        .in(
            "request_status",
            ["Pending", "Under Review", "Approved"]
        )
        .maybeSingle();

    if (existingRequestError) {
        throw existingRequestError;
    }

    if (existingRequest) {
        throw new Error(
            "There is already an active ID request for this application."
        );
    }

    /*
     * If the applicant edited their application before
     * submitting the request, save those changes now.
     */
    let updatedApplication = application;

    if (applicationChanges) {
        updatedApplication =
            await updateApplication(
                applicationId,
                applicationChanges,
                files,
                ["completed"]
            );
    }

    // Create the ID request
    const {
        data: idRequest,
        error: idRequestError
    } = await supabase
        .from("id_requests")
        .insert([
            {
                application_id: applicationId,
                reason: normalizedReason,
                other_reason:
                    normalizedReason === "Other"
                        ? String(otherReason || "").trim()
                        : null,
                request_status: "Pending"
            }
        ])
        .select()
        .single();

    if (idRequestError) {
        throw idRequestError;
    }

    return {
        application: updatedApplication,
        idRequest
    };
}