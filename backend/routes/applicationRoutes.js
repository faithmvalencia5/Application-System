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
    recoverApplicationId
} from "../controllers/applicationController.js";

import { getApplicationStatus } from "../controllers/statusController.js";

const router = express.Router();

router.get("/test", testDatabase);
router.post(
    "/register",
    upload.fields([
        { name: "valid_id_front", maxCount: 1 },
        { name: "valid_id_back", maxCount: 1 },
        { name: "latest_photo", maxCount: 1 },
        { name: "birth_certificate", maxCount: 1 },
        { name: "community_tax_certificate", maxCount: 1 },
        { name: "signature", maxCount: 1 },
        { name: "verification_photo", maxCount: 1 }
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
        {
            name: "community_tax_certificate",
            maxCount: 1
        },
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
        { name: "signature", maxCount: 1 }
    ]),
    submitIdRequest);
router.get(
    "/duplicate/recover/:sessionId",
    recoverApplicationId
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
        { name: "signature", maxCount: 1 }
    ]),
    updateApplication
);
router.post(
  "/duplicate/verify",
  verifyDuplicateApplicant
);
export default router;