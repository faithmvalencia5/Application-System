import { supabase } from "../supabase.js";

export async function uploadFile(applicationId, file, folder) {

    console.log("===== uploadFile =====");
    console.log("applicationId:", applicationId);
    console.log("folder:", folder);
    console.log("file:", file);

    if (!file) {
        console.log("NO FILE RECEIVED");
        return null;
    }

    const fileName = `${applicationId}/${folder}-${Date.now()}-${file.originalname}`;

    console.log("Uploading:", fileName);

    const { data, error } = await supabase.storage
        .from("documents")
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    console.log("Upload result:", data);
    console.log("Upload error:", error);

    if (error) {
        throw error;
    }

    return fileName;
}