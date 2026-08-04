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
        const files = req.files;

        console.log("========== FILES RECEIVED ==========");
        console.log(files);

        console.log("========== BODY ==========");
        console.log(req.body);

        const result = await registerApplicationService(payload, files);

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