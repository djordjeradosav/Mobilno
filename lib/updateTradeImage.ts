import { supabase } from "./supabase";

const BUCKET = "forecasts";

/**
 * Ažurira sliku grafikona za postojeću prognozu (trejd).
 *
 * 1) Preuzima staru sliku URL iz baze podataka
 * 2) Briše staru sliku iz Supabase Storage (ako postoji)
 * 3) Upload-uje novu sliku
 * 4) Ažurira `chart_image_url` u `trades` tabeli
 *
 * @param tradeId - ID prognoze koja se ažurira
 * @param uri - URI nove slike (iz expo-image-picker)
 * @param userId - ID korisnika koji je vlasnik prognoze
 * @returns Novi javni URL slike ili null ako je došlo do greške
 */
export async function updateTradeImage(
    tradeId: string,
    uri: string,
    userId: string,
): Promise<string | null> {
    try {
        // 1. Preuzmi staru sliku URL iz baze
        const { data: tradeData, error: fetchError } = await supabase
            .from("trades")
            .select("chart_image_url")
            .eq("id", tradeId)
            .single();

        if (fetchError) {
            console.warn("[updateTradeImage] fetch error:", fetchError.message);
            return null;
        }

        // 2. Obriši staru sliku iz Storage-a (ako postoji)
        if (tradeData?.chart_image_url) {
            try {
                // Ekstraktuj putanju iz URL-a
                // URL format: https://...storage/v1/object/public/forecasts/{userId}/{timestamp}.{ext}
                const urlParts = tradeData.chart_image_url.split('/');
                const bucketIndex = urlParts.indexOf('forecasts');
                if (bucketIndex !== -1) {
                    const oldPath = urlParts.slice(bucketIndex + 1).join('/');
                    await supabase.storage.from(BUCKET).remove([oldPath]);
                }
            } catch (deleteErr: any) {
                console.warn("[updateTradeImage] delete old image failed:", deleteErr?.message);
                // Nastavi sa upload-om čak i ako brisanje ne uspe
            }
        }

        // 3. Upload-uj novu sliku
        const res = await fetch(uri);
        const blob = await res.blob();
        const mime = blob.type || "image/jpeg";
        const ext = mime.split("/")[1]?.split(";")[0] || "jpg";
        const filename = `${userId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(filename, blob, {
                contentType: mime,
                upsert: false,
            });

        if (uploadError) {
            console.warn("[updateTradeImage] upload failed:", uploadError.message);
            return null;
        }

        // 4. Ažuriri `chart_image_url` u bazi podataka
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        const newImageUrl = data?.publicUrl ?? null;

        if (newImageUrl) {
            const { error: updateError } = await supabase
                .from("trades")
                .update({ chart_image_url: newImageUrl })
                .eq("id", tradeId);

            if (updateError) {
                console.warn("[updateTradeImage] database update failed:", updateError.message);
                return null;
            }
        }

        return newImageUrl;
    } catch (err: any) {
        console.warn("[updateTradeImage] error:", err?.message ?? err);
        return null;
    }
}

/**
 * Briše sliku grafikona za prognozu.
 *
 * @param tradeId - ID prognoze
 * @returns true ako je brisanje uspelo, false inače
 */
export async function deleteTradeImage(tradeId: string): Promise<boolean> {
    try {
        // Preuzmi sliku URL
        const { data: tradeData, error: fetchError } = await supabase
            .from("trades")
            .select("chart_image_url")
            .eq("id", tradeId)
            .single();

        if (fetchError || !tradeData?.chart_image_url) {
            return false;
        }

        // Obriši sliku iz Storage-a
        try {
            const urlParts = tradeData.chart_image_url.split('/');
            const bucketIndex = urlParts.indexOf('forecasts');
            if (bucketIndex !== -1) {
                const oldPath = urlParts.slice(bucketIndex + 1).join('/');
                await supabase.storage.from(BUCKET).remove([oldPath]);
            }
        } catch (deleteErr: any) {
            console.warn("[deleteTradeImage] storage delete failed:", deleteErr?.message);
        }

        // Ažuriri bazu da obriši URL
        const { error: updateError } = await supabase
            .from("trades")
            .update({ chart_image_url: null })
            .eq("id", tradeId);

        return !updateError;
    } catch (err: any) {
        console.warn("[deleteTradeImage] error:", err?.message ?? err);
        return false;
    }
}
