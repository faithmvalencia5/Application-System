import { supabase } from "../supabase.js";

export async function uploadFile(applicationId, file, folder) {

    if (!file) {
        return null;
    }

    const fileName = `${applicationId}/${folder}-${Date.now()}-${file.originalname}`;

    const { error } = await supabase.storage
        .from("documents")
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) {
        throw error;
    }

    return fileName;
}