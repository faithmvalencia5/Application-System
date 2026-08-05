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