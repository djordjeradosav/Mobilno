const AV_KEY = process.env.EXPO_PUBLIC_ALPHA_VANTAGE_KEY ?? '';

// Simple in-memory cache (5 minutes)
const cache: Record<string, { value: string; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000;

export async function getForexRate(from: string, to: string): Promise<string> {
    const key = `${from}/${to}`;
    const cached = cache[key];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.value;
    }

    if (!AV_KEY) {
        return getMockRate(from, to);
    }

    try {
        const res = await fetch(
            `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${AV_KEY}`
        );
        const data = await res.json();
        const rate =
            data['Realtime Currency Exchange Rate']?.['5. Exchange Rate'] ?? null;
        if (rate) {
            cache[key] = { value: parseFloat(rate).toFixed(4), ts: Date.now() };
            return parseFloat(rate).toFixed(4);
        }
    } catch {
        // fall through to mock
    }
    return getMockRate(from, to);
}

function getMockRate(from: string, to: string): string {
    const MOCK: Record<string, string> = {
        'EUR/USD': '1.0842',
        'GBP/USD': '1.2731',
        'AUD/USD': '0.6478',
        'JPY/USD': '0.0066',
        'CHF/USD': '1.1023',
        'NZD/USD': '0.5912',
        'CAD/USD': '0.7321',
    };
    return MOCK[`${from}/${to}`] ?? (Math.random() * 1.5 + 0.5).toFixed(4);
}