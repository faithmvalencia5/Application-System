import express from "express";
import upload from "../middleware/upload.js";
import {
    testDatabase,
    registerApplication,
    getApplicationById,
    updateApplication,
    submitIdRequest,
    verifyDuplicateApplicant,
    getVerifiedDuplicateRecord,
    updateVerifiedDuplicateRecord,
    recoverApplicationId,
    updateDocumentAuthentication,
    listStaffApplications,
    getStaffApplicationDetail,
    updateStaffApplicationStatus,
    createApplicationUploadTicket
} from "../controllers/applicationController.js";

import { getApplicationStatus } from "../controllers/statusController.js";
import { verifyFace, verifyAge, screenDocument, verificationHealth } from "../controllers/verificationController.js";

const router = express.Router();

router.post("/upload-ticket", createApplicationUploadTicket);
router.post("/verify-face", verifyFace);
router.post("/verify-age", verifyAge);
router.post("/screen-document", screenDocument);
router.get("/verification-health", verificationHealth);
router.get("/test", testDatabase);
router.get("/staff", listStaffApplications);
router.get("/staff/:applicationId", getStaffApplicationDetail);
router.patch("/staff/:applicationId/status", updateStaffApplicationStatus);
router.post(
    "/register",
    upload.fields([
        { name: "valid_id_front", maxCount: 1 },
        { name: "valid_id_back", maxCount: 1 },
        { name: "latest_photo", maxCount: 1 },
        { name: "birth_certificate", maxCount: 1 },
        { name: "community_tax_certificate", maxCount: 1 },
        { name: "verification_photo", maxCount: 1 },
        { name: "signature", maxCount: 1 },
    ]),
    registerApplication
);
router.get(
    "/duplicate/verified/:sessionId",
    getVerifiedDuplicateRecord
);
router.put(
    "/duplicate/verified/:sessionId",
    upload.fields([
        { name: "valid_id_front", maxCount: 1 },
        { name: "valid_id_back", maxCount: 1 },
        { name: "latest_photo", maxCount: 1 },
        { name: "birth_certificate", maxCount: 1 },
        {name: "community_tax_certificate", maxCount: 1 },
        { name: "verification_photo", maxCount: 1 },
        { name: "signature", maxCount: 1 }
    ]),
    updateVerifiedDuplicateRecord
);
router.get("/status/:applicationId", getApplicationStatus);
router.post("/:applicationId/id-request",
    upload.fields([
        { name: "valid_id_front", maxCount: 1 },
        { name: "valid_id_back", maxCount: 1 },
        { name: "latest_photo", maxCount: 1 },
        { name: "birth_certificate", maxCount: 1 },
        { name: "community_tax_certificate", maxCount: 1 },
        { name: "verification_photo", maxCount: 1 },
        { name: "signature", maxCount: 1 }
    ]),
    submitIdRequest);
router.get(
    "/duplicate/recover/:sessionId",
    recoverApplicationId
);
router.patch(
    "/:applicationId/document-authentication",
    updateDocumentAuthentication
);
router.get("/:applicationId", getApplicationById);

router.put(
    "/:applicationId",
    upload.fields([
        { name: "valid_id_front", maxCount: 1 },
        { name: "valid_id_back", maxCount: 1 },
        { name: "latest_photo", maxCount: 1 },
        { name: "birth_certificate", maxCount: 1 },
        { name: "community_tax_certificate", maxCount: 1 },
        { name: "verification_photo", maxCount: 1 },
        { name: "signature", maxCount: 1 }
    ]),
    updateApplication
);
router.post(
  "/duplicate/verify",
  verifyDuplicateApplicant
);
export default router;