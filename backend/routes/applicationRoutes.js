import express from "express";
import upload from "../middleware/upload.js";
import {
    testDatabase,
    registerApplication
} from "../controllers/applicationController.js";

const router = express.Router();

router.get("/test", testDatabase);
router.post(
    "/register",
    (req, res, next) => {
        console.log("REGISTER REQUEST RECEIVED");
        next();
    },
    upload.fields([
        { name: "valid_id", maxCount: 1 },
        { name: "latest_photo", maxCount: 1 },
        { name: "birth_certificate", maxCount: 1 },
        { name: "community_tax_certificate", maxCount: 1 },
        { name: "signature", maxCount: 1 }
    ]),
    registerApplication
);    
export default router;