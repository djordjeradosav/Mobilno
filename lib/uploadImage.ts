import { supabase } from "./supabase";

const BUCKET = "forecasts";

/**
 * Upload an image (from expo-image-picker) to Supabase Storage and return the
 * public URL, or null on failure.
 *
 * `uri` may be a `file://`, `data:`, or `blob:` URI depending on platform.
 */
export async function uploadForecastImage(
    uri: string,
    userId: string,
): Promise<string | null> {
    try {
        const res = await fetch(uri);
        const blob = await res.blob();

        // Pick a sensible extension
        const mime = blob.type || "image/jpeg";
        const ext = mime.split("/")[1]?.split(";")[0] || "jpg";
        const filename = `${userId}/${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(filename, blob, {
                contentType: mime,
                upsert: false,
            });

        if (error) {
            console.warn("[uploadForecastImage] upload failed:", error.message);
            return null;
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        return data?.publicUrl ?? null;
    } catch (err: any) {
        console.warn("[uploadForecastImage] error:", err?.message ?? err);
        return null;
    }
}
