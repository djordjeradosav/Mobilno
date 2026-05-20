import { supabase } from "./supabase";

const BUCKET = "forecasts";

/**
 * Upload slike chart-a u Supabase Storage preko REST API-ja.
 *
 * 1) uri (expo-image-picker) → fetch → Blob
 * 2) POST /storage/v1/object/forecasts/{userId}/{timestamp}.jpg
 * 3) Vraća javni URL: /storage/v1/object/public/forecasts/...
 *
 * Bucket "forecasts" mora postojati i biti public u Supabase Dashboard.
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
