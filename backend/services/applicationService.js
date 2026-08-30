import { supabase } from "../supabase.js";
import { uploadFile } from "./storageService.js";

const FACE_VERIFICATION_URL =
    process.env.FACE_VERIFICATION_URL;


async function verifyApplicantFace(files) {

    const validIdFront =
        files?.valid_id_front?.[0];

    const verificationPhoto =
        files?.verification_photo?.[0];


    if (!validIdFront) {
        throw new Error(
            "The front of the valid government ID is required for face verification."
        );
    }


    if (!verificationPhoto) {
        throw new Error(
            "Face verification must be completed before submitting the application."
        );
    }


    if (
        !validIdFront.mimetype ||
        !validIdFront.mimetype.startsWith("image/")
    ) {
        throw new Error(
            "The front of the valid government ID must be an image for face verification."
        );
    }


    if (
        !verificationPhoto.mimetype ||
        !verificationPhoto.mimetype.startsWith("image/")
    ) {
        throw new Error(
            "The captured verification photo is invalid."
        );
    }


    if (!FACE_VERIFICATION_URL) {
        throw new Error(
            "Face verification service is not configured."
        );
    }


    const formData =
        new FormData();


    const validIdBlob =
        new Blob(
            [validIdFront.buffer],
            {
                type:
                    validIdFront.mimetype
            }
        );


    const verificationBlob =
        new Blob(
            [verificationPhoto.buffer],
            {
                type:
                    verificationPhoto.mimetype
            }
        );


    formData.append(
        "source_image",
        validIdBlob,
        validIdFront.originalname ||
            "valid-id.jpg"
    );


    formData.append(
        "target_image",
        verificationBlob,
        verificationPhoto.originalname ||
            "face-verification.jpg"
    );


    let response;


    try {

        response = await fetch(
            FACE_VERIFICATION_URL,
            {
                method: "POST",
                body: formData
            }
        );

    } catch (error) {

        console.error(
            "Unable to reach face verification service:",
            error
        );

        throw new Error(
            "Face verification service is temporarily unavailable. Please try again."
        );
    }


    let result;


    try {

        result =
            await response.json();

    } catch (error) {

        throw new Error(
            "Face verification service returned an invalid response."
        );
    }


    if (!response.ok) {

        throw new Error(
            result.message ||
            "Face verification service failed."
        );
    }


    /*
     * All three conditions must pass.
     *
     * success          = Python request worked
     * livenessPassed   = live person, not detected spoof
     * verified         = face matches uploaded ID
     */
    if (
        result.success !== true ||
        result.livenessPassed !== true ||
        result.verified !== true
    ) {

        throw new Error(
            result.message ||
            "Face verification failed."
        );
    }


    return result;
}

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

// =====================================================
// DOCUMENT AUTHENTICATION
// =====================================================

export async function updateDocumentAuthentication({
    applicationId,
    documentType,
    authenticationStatus,
    authenticationMethod,
    authenticatedBy,
    authenticationRemarks
}) {

    const allowedStatuses = [
        "pending",
        "authenticated",
        "failed",
        "needs_review"
    ];

    const allowedDocumentTypes = [
        "valid_id",
        "birth_certificate",
        "community_tax_certificate"
    ];


    // -------------------------------------------------
    // Validate application ID
    // -------------------------------------------------

    if (!applicationId) {
        throw new Error(
            "Application ID is required."
        );
    }


    // -------------------------------------------------
    // Validate document type
    // -------------------------------------------------

    if (
        !allowedDocumentTypes.includes(
            documentType
        )
    ) {
        throw new Error(
            "Invalid document type."
        );
    }


    // -------------------------------------------------
    // Validate authentication status
    // -------------------------------------------------

    if (
        !allowedStatuses.includes(
            authenticationStatus
        )
    ) {
        throw new Error(
            "Invalid document authentication status."
        );
    }


    // -------------------------------------------------
    // Prepare authentication record
    // -------------------------------------------------

    const authenticationData = {

        application_id:
            applicationId,

        document_type:
            documentType,

        authentication_status:
            authenticationStatus,

        authentication_method:
            authenticationMethod || null,

        authenticated_by:
            authenticatedBy || null,

        authenticated_at:
            (
                authenticationStatus ===
                "authenticated"
                    ? new Date().toISOString()
                    : null
            ),

        authentication_remarks:
            authenticationRemarks || null,

        updated_at:
            new Date().toISOString()
    };


    // -------------------------------------------------
    // Insert OR update the document authentication
    //
    // UNIQUE(application_id, document_type)
    // allows us to safely use upsert.
    // -------------------------------------------------

    const {
        data,
        error
    } = await supabase
        .from(
            "document_authentications"
        )
        .upsert(
            authenticationData,
            {
                onConflict:
                    "application_id,document_type"
            }
        )
        .select()
        .single();


    if (error) {

        console.error(
            "Document authentication update error:",
            error
        );

        throw new Error(
            "Unable to update document authentication."
        );
    }

    return data;
}

// =====================================================
// RESET DOCUMENT AUTHENTICATION
// =====================================================

async function resetDocumentAuthentication(
    applicationId,
    documentType
) {

    const {
        error
    } = await supabase
        .from(
            "document_authentications"
        )
        .upsert(
            {
                application_id:
                    applicationId,

                document_type:
                    documentType,

                authentication_status:
                    "pending",

                authentication_method:
                    null,

                authenticated_by:
                    null,

                authenticated_at:
                    null,

                authentication_remarks:
                    "Document was replaced and requires re-authentication.",

                updated_at:
                    new Date().toISOString()
            },
            {
                onConflict:
                    "application_id,document_type"
            }
        );


    if (error) {

        console.error(
            "Unable to reset document authentication:",
            documentType,
            error
        );

        throw error;
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

        const faceVerification =
            await verifyApplicantFace(
                files
            );


        const duplicate =
            await findDuplicateApplicant(
                applicationsData
            );

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

        // =================================================
        // SAVE AUTHORITATIVE FACE VERIFICATION RESULT
        // =================================================

        const {
            error: faceVerificationError
        } = await supabase
            .from(
                "face_verifications"
            )
            .insert([
                {
                    application_id:
                        applicationId,

                    verified:
                        true,

                    similarity:
                        faceVerification.similarity ??
                        null,

                    threshold:
                        faceVerification.threshold ??
                        null,

                    source_face_confidence:
                        faceVerification.sourceFaceConfidence ??
                        null,

                    target_face_confidence:
                        faceVerification.targetFaceConfidence ??
                        null,

                    liveness_passed:
                        faceVerification.livenessPassed ===
                        true,

                    liveness_score:
                        faceVerification.livenessScore ??
                        null,

                    verification_method:
                        "YuNet + MiniFASNetV2 + SFace"
                }
            ]);


        if (faceVerificationError) {
            throw faceVerificationError;
        }

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

        // =================================================
        // TABLE 6B: DOCUMENT AUTHENTICATIONS
        //
        // Every newly submitted required document starts
        // as "pending". OSCA staff will perform the final
        // authenticity verification.
        // =================================================

        const documentAuthenticationRows = [
            {
                application_id:
                    applicationId,

                document_type:
                    "valid_id",

                authentication_status:
                    "pending"
            },

            {
                application_id:
                    applicationId,

                document_type:
                    "birth_certificate",

                authentication_status:
                    "pending"
            },

            {
                application_id:
                    applicationId,

                document_type:
                    "community_tax_certificate",

                authentication_status:
                    "pending"
            }
        ];


        const {
            error: documentAuthenticationError
        } = await supabase
            .from(
                "document_authentications"
            )
            .insert(
                documentAuthenticationRows
            );


        if (documentAuthenticationError) {

            console.error(
                "Unable to create document authentication records:",
                documentAuthenticationError
            );

            throw documentAuthenticationError;
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
        confirmationsResult,
        documentAuthenticationsResult
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
            .maybeSingle(),

        supabase
            .from("document_authentications")
            .select("*")
            .eq("application_id", applicationId)
            .order("id", {ascending: true})
    ]);

    const errors = [
        applicationResult.error,
        familyResult.error,
        membershipResult.error,
        personalBackgroundResult.error,
        problemsNeedsResult.error,
        applicationFilesResult.error,
        confirmationsResult.error,
        documentAuthenticationsResult.error
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
            confirmationsResult.data || null,
        documentAuthentications:
            documentAuthenticationsResult.data || []
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

    // =====================================================
    // RESET AUTHENTICATION FOR REPLACED DOCUMENTS
    // =====================================================

    const authenticationResets = [];


    if (
        files?.valid_id_front?.[0] ||
        files?.valid_id_back?.[0]
    ) {

        authenticationResets.push(
            resetDocumentAuthentication(
                applicationId,
                "valid_id"
            )
        );
    }


    if (
        files?.birth_certificate?.[0]
    ) {

        authenticationResets.push(
            resetDocumentAuthentication(
                applicationId,
                "birth_certificate"
            )
        );
    }


    if (
        files?.community_tax_certificate?.[0]
    ) {

        authenticationResets.push(
            resetDocumentAuthentication(
                applicationId,
                "community_tax_certificate"
            )
        );
    }


    if (
        authenticationResets.length > 0
    ) {

        await Promise.all(
            authenticationResets
        );
    }

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
            ["Pending", "Under Review", "In Process", "Ready for Release", "Completed"]
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

export async function verifyDuplicateIdentity(
  sessionId,
  surname,
  firstName,
  middleName,
  dateOfBirth
) {
  // Get the temporary verification session
  const { data: session, error: sessionError } =
    await supabase
      .from("duplicate_verification_sessions")
      .select(`
        id,
        application_id,
        purpose,
        verified,
        expires_at
      `)
      .eq("id", sessionId)
      .single();

  if (sessionError || !session) {
    return {
      verified: false,
      reason: "invalid_session"
    };
  }

  // Check expiration
  if (
    new Date(session.expires_at).getTime() <
    Date.now()
  ) {
    return {
      verified: false,
      reason: "expired"
    };
  }

  // Get the existing applicant
  const { data: applicant, error: applicantError } =
    await supabase
      .from("applications")
      .select(`
        application_id,
        surname,
        first_name,
        middle_name,
        date_of_birth
      `)
      .eq(
        "application_id",
        session.application_id
      )
      .single();

  if (applicantError || !applicant) {
    return {
      verified: false,
      reason: "record_not_found"
    };
  }

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const surnameMatches =
    normalize(applicant.surname) ===
    normalize(surname);

  const firstNameMatches =
    normalize(applicant.first_name) ===
    normalize(firstName);

  const middleNameMatches =
    normalize(applicant.middle_name) ===
    normalize(middleName);

  const birthdateMatches =
    String(applicant.date_of_birth) ===
    String(dateOfBirth);

  if (
    !surnameMatches ||
    !firstNameMatches ||
    !middleNameMatches ||
    !birthdateMatches
  ) {
    return {
      verified: false,
      reason: "identity_mismatch"
    };
  }

  // Mark session as verified
  const { error: updateError } =
    await supabase
      .from("duplicate_verification_sessions")
      .update({
        verified: true
      })
      .eq("id", session.id);

  if (updateError) {
    throw updateError;
  }

  return {
    verified: true,
    purpose: session.purpose
  };
}

export async function getVerifiedDuplicateApplication(
    sessionId
) {
    const {
        data: session,
        error: sessionError
    } = await supabase
        .from("duplicate_verification_sessions")
        .select(`
            id,
            application_id,
            purpose,
            verified,
            expires_at
        `)
        .eq("id", sessionId)
        .maybeSingle();

    if (sessionError) {
        throw sessionError;
    }

    if (!session) {
        throw new Error(
            "Verification session not found."
        );
    }

    if (
        new Date(session.expires_at).getTime() <
        Date.now()
    ) {
        throw new Error(
            "Verification session has expired."
        );
    }

    if (!session.verified) {
        throw new Error(
            "Identity verification is required."
        );
    }

    if (
        session.purpose !== "update_existing"
    ) {
        throw new Error(
            "This verification session cannot be used to update a record."
        );
    }

    const applicationData =
        await getApplicationById(
            session.application_id
        );

    if (!applicationData) {
        throw new Error(
            "Existing application record not found."
        );
    }

    return applicationData;
}

export async function updateVerifiedDuplicateApplication(
    sessionId,
    payload,
    files
) {
    const {
        data: session,
        error: sessionError
    } = await supabase
        .from("duplicate_verification_sessions")
        .select(`
            id,
            application_id,
            purpose,
            verified,
            expires_at
        `)
        .eq("id", sessionId)
        .maybeSingle();

    if (sessionError) {
        throw sessionError;
    }

    if (!session) {
        throw new Error(
            "Verification session not found."
        );
    }

    if (
        new Date(session.expires_at).getTime() <
        Date.now()
    ) {
        throw new Error(
            "Verification session has expired."
        );
    }

    if (!session.verified) {
        throw new Error(
            "Identity verification is required."
        );
    }

    if (
        session.purpose !== "update_existing"
    ) {
        throw new Error(
            "This verification session cannot be used to update a record."
        );
    }

    const {
        data: latestStatusRows,
        error: latestStatusError
    } = await supabase
        .from("application_status_history")
        .select("status, updated_at")
        .eq(
            "application_id",
            session.application_id
        )
        .order(
            "updated_at",
            { ascending: false }
        )
        .limit(1);

    if (latestStatusError) {
        throw latestStatusError;
    }

    const currentStatus =
        String(
            latestStatusRows?.[0]?.status ||
            "Pending"
        )
            .trim()
            .toLowerCase();

    const updatedApplication =
        await updateApplication(
            session.application_id,
            payload,
            files,
            [currentStatus]
        );

    /*
    * Create an ID request because the applicant
    * updated information on an existing record.
    */
    let idRequest = null;

    const {
        data: existingActiveRequest,
        error: existingRequestError
    } = await supabase
        .from("id_requests")
        .select("id, request_status")
        .eq(
            "application_id",
            session.application_id
        )
        .in(
            "request_status",
            [
                "Pending",
                "Under Review",
                "In Process",
                "Ready for Release",
                "Completed"
            ]
        )
        .maybeSingle();

    if (existingRequestError) {
        throw existingRequestError;
    }

    if (existingActiveRequest) {

        idRequest = existingActiveRequest;

    } else {

        const {
            data: createdRequest,
            error: requestError
        } = await supabase
            .from("id_requests")
            .insert([
                {
                    application_id:
                        session.application_id,

                    reason: "Other",

                    other_reason:
                        "Applicant information updated from an existing record.",

                    request_status:
                        "Pending"
                }
            ])
            .select()
            .single();

        if (requestError) {
            throw requestError;
        }

        idRequest = createdRequest;
    }

    const authenticationResets = [];


    if (
        files?.valid_id_front?.[0] ||
        files?.valid_id_back?.[0]
    ) {

        authenticationResets.push(
            resetDocumentAuthentication(
                session.application_id,
                "valid_id"
            )
        );
    }


    if (
        files?.birth_certificate?.[0]
    ) {

        authenticationResets.push(
            resetDocumentAuthentication(
                applicationId,
                "birth_certificate"
            )
        );
    }


    if (
        files?.community_tax_certificate?.[0]
    ) {

        authenticationResets.push(
            resetDocumentAuthentication(
                applicationId,
                "community_tax_certificate"
            )
        );
    }


    if (
        authenticationResets.length > 0
    ) {

        await Promise.all(
            authenticationResets
        );
    }

    /*
     * Make the session one-time-use after a
     * successful update.
     */
    const { error: deleteSessionError } =
        await supabase
            .from(
                "duplicate_verification_sessions"
            )
            .delete()
            .eq("id", session.id);

    if (deleteSessionError) {
        console.error(
            "Unable to remove used duplicate session:",
            deleteSessionError
        );
    }

    return {
        application:
            updatedApplication,

        applicationId:
            session.application_id,

        idRequest:
            idRequest
    };
}

export async function recoverVerifiedApplicationId(
    sessionId
) {
    const {
        data: session,
        error: sessionError
    } = await supabase
        .from("duplicate_verification_sessions")
        .select(`
            id,
            application_id,
            purpose,
            verified,
            expires_at
        `)
        .eq("id", sessionId)
        .maybeSingle();

    if (sessionError) {
        throw sessionError;
    }

    if (!session) {
        throw new Error(
            "Verification session not found."
        );
    }

    if (
        new Date(session.expires_at).getTime() <
        Date.now()
    ) {
        throw new Error(
            "Verification session has expired."
        );
    }

    if (!session.verified) {
        throw new Error(
            "Identity verification is required."
        );
    }

    if (
        session.purpose !==
        "recover_application_id"
    ) {
        throw new Error(
            "This verification session cannot be used to recover an Application ID."
        );
    }

    const applicationId =
        session.application_id;

    /*
     * Make the recovery session one-time-use.
     */
    const { error: deleteSessionError } =
        await supabase
            .from(
                "duplicate_verification_sessions"
            )
            .delete()
            .eq("id", session.id);

    if (deleteSessionError) {
        console.error(
            "Unable to remove recovery session:",
            deleteSessionError
        );
    }

    return {
        applicationId
    };
}