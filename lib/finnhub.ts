const FINNHUB_KEY = process.env.EXPO_PUBLIC_FINNHUB_KEY ?? '';

export async function getStockNews(symbol: string) {
    if (!FINNHUB_KEY) return getMockNews();
    const from = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const to = new Date().toISOString().split('T')[0];
    try {
        const res = await fetch(
            `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
        );
        const data = await res.json();
        return Array.isArray(data) ? data.slice(0, 10) : getMockNews();
    } catch {
        return getMockNews();
    }
}

export async function getMarketNews() {
    if (!FINNHUB_KEY) return getMockNews();
    try {
        const res = await fetch(
            `https://finnhub.io/api/v1/news?category=forex&token=${FINNHUB_KEY}`
        );
        const data = await res.json();
        return Array.isArray(data) ? data.slice(0, 10) : getMockNews();
    } catch {
        return getMockNews();
    }
}

function getMockNews() {
    return [
        {
            id: 1,
            headline: 'EUR/USD climbs on softer US CPI data, eyes 1.0950 resistance',
            summary: 'The euro gained ground as inflation data came in below expectations.',
            url: 'https://finnhub.io',
            source: 'Forex Factory',
            datetime: Date.now() / 1000 - 3600,
        },
        {
            id: 2,
            headline: 'Fed holds rates steady — markets price in two cuts by year-end',
            summary: 'Federal Reserve maintains its wait-and-see approach.',
            url: 'https://finnhub.io',
            source: 'Reuters',
            datetime: Date.now() / 1000 - 7200,
        },
        {
            id: 3,
            headline: 'Gold breaks above $2,400 amid geopolitical tensions',
            summary: 'Safe-haven demand pushes XAU/USD to multi-month highs.',
            url: 'https://finnhub.io',
            source: 'Bloomberg',
            datetime: Date.now() / 1000 - 10800,
        },
        {
            id: 4,
            headline: 'GBP/USD rallies on strong UK employment figures',
            summary: 'Sterling outperforms peers as jobs data surprises to the upside.',
            url: 'https://finnhub.io',
            source: 'FXStreet',
            datetime: Date.now() / 1000 - 14400,
        },
        {
            id: 5,
            headline: 'JPY weakens further as BoJ signals no rush to hike rates',
            summary: 'Bank of Japan maintains ultra-loose monetary policy stance.',
            url: 'https://finnhub.io',
            source: 'Nikkei',
            datetime: Date.now() / 1000 - 18000,
        },
    ];
}