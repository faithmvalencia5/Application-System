import express from "express";
import upload from "../middleware/upload.js";
import {
    testDatabase,
    registerApplication,
    getApplicationById
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
        { name: "signature", maxCount: 1 }
    ]),
    registerApplication
);
router.get("/status/:applicationId", getApplicationStatus);
router.get("/:applicationId", getApplicationById);
export default router;