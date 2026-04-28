// FRED (Federal Reserve Economic Data) helper — public series via apiKey.
// Docs: https://fred.stlouisfed.org/docs/api/fred/

const FRED_KEY = process.env.EXPO_PUBLIC_FRED_API_KEY ?? '';

export type FredObservation = {
    date: string;     // YYYY-MM-DD
    value: number;    // numeric value (NaN if missing)
};

export type FredSeries = {
    id: string;
    title: string;
    unit: string;
    emoji: string;
    observations: FredObservation[];   // newest first
    latest: FredObservation | null;
    previous: FredObservation | null;
    changePct: number | null;          // % change vs previous observation
};

export const FRED_SERIES: { id: string; title: string; unit: string; emoji: string }[] = [
    { id: 'GDP', title: 'Real GDP', unit: '$B', emoji: '📈' },
    { id: 'UNRATE', title: 'Unemployment Rate', unit: '%', emoji: '👷' },
    { id: 'CPIAUCSL', title: 'CPI (Inflation)', unit: 'index', emoji: '🛒' },
    { id: 'FEDFUNDS', title: 'Federal Funds Rate', unit: '%', emoji: '🏦' },
    { id: 'DGS10', title: '10-Year Treasury Yield', unit: '%', emoji: '💵' },
    { id: 'UMCSENT', title: 'Consumer Sentiment', unit: 'index', emoji: '😊' },
    { id: 'INDPRO', title: 'Industrial Production', unit: 'index', emoji: '🏭' },
    { id: 'PAYEMS', title: 'Nonfarm Payrolls', unit: 'K jobs', emoji: '💼' },
    { id: 'M2SL', title: 'M2 Money Supply', unit: '$B', emoji: '💰' },
    { id: 'DCOILWTICO', title: 'Crude Oil (WTI)', unit: '$', emoji: '🛢️' },
];

export const hasFredKey = () => Boolean(FRED_KEY);

export async function getFredSeries(seriesId: string, limit = 24): Promise<FredSeries | null> {
    const meta = FRED_SERIES.find((s) => s.id === seriesId);
    if (!meta) return null;
    if (!FRED_KEY) return null;

    try {
        const url =
            `https://api.stlouisfed.org/fred/series/observations` +
            `?series_id=${seriesId}` +
            `&api_key=${FRED_KEY}` +
            `&file_type=json` +
            `&sort_order=desc` +
            `&limit=${limit}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const raw: any[] = data?.observations ?? [];
        const observations: FredObservation[] = raw
            .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
            .filter((o) => !Number.isNaN(o.value));

        const latest = observations[0] ?? null;
        const previous = observations[1] ?? null;
        let changePct: number | null = null;
        if (latest && previous && previous.value !== 0) {
            changePct = ((latest.value - previous.value) / previous.value) * 100;
        }

        return { ...meta, observations, latest, previous, changePct };
    } catch {
        return null;
    }
}

export async function getAllFredSeries(): Promise<FredSeries[]> {
    const results = await Promise.all(FRED_SERIES.map((s) => getFredSeries(s.id, 24)));
    return results.filter((r): r is FredSeries => r !== null);
}

export function formatFredValue(v: number, unit: string): string {
    if (unit === '$B' || unit === 'K jobs') {
        return v >= 1000 ? `${(v / 1000).toFixed(2)}T` : `${v.toFixed(1)}`;
    }
    if (unit === '%') return `${v.toFixed(2)}%`;
    if (unit === '$') return `$${v.toFixed(2)}`;
    return v.toFixed(2);
}
