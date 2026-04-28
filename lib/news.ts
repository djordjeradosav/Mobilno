// Forex & macro news via Alpha Vantage NEWS_SENTIMENT (uses existing key).
// Style/feed inspired by ForexFactory news.

const AV_KEY = process.env.EXPO_PUBLIC_ALPHA_VANTAGE_KEY ?? '';

export type NewsItem = {
    id: string;
    headline: string;
    summary: string;
    url: string;
    source: string;
    image: string | null;
    datetime: number;          // unix seconds
    sentiment: 'bullish' | 'bearish' | 'neutral';
    tickers: string[];
};

function parseAVTime(s: string): number {
    // Alpha Vantage uses "20240115T120000" format
    const y = +s.slice(0, 4);
    const mo = +s.slice(4, 6) - 1;
    const d = +s.slice(6, 8);
    const h = +s.slice(9, 11);
    const mi = +s.slice(11, 13);
    return Math.floor(Date.UTC(y, mo, d, h, mi) / 1000);
}

function classifySentiment(score: number): NewsItem['sentiment'] {
    if (score > 0.15) return 'bullish';
    if (score < -0.15) return 'bearish';
    return 'neutral';
}

async function fetchAV(topics: string): Promise<NewsItem[]> {
    if (!AV_KEY) return mockNews();
    try {
        const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=${topics}&limit=30&apikey=${AV_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data?.feed || !Array.isArray(data.feed)) {
            // Likely rate-limited (free tier = 25/day). Fall back to mock.
            return mockNews();
        }
        return data.feed.slice(0, 20).map((item: any, i: number) => ({
            id: `${item.url ?? i}`,
            headline: item.title ?? '',
            summary: item.summary ?? '',
            url: item.url ?? '',
            source: item.source ?? 'News',
            image: item.banner_image ?? null,
            datetime: item.time_published ? parseAVTime(item.time_published) : Date.now() / 1000,
            sentiment: classifySentiment(parseFloat(item.overall_sentiment_score ?? '0')),
            tickers: Array.isArray(item.ticker_sentiment)
                ? item.ticker_sentiment.slice(0, 3).map((t: any) => t.ticker)
                : [],
        }));
    } catch {
        return mockNews();
    }
}

export function getForexNews(): Promise<NewsItem[]> {
    return fetchAV('forex,economy_macro,economy_fiscal,economy_monetary');
}

export function getMacroNews(): Promise<NewsItem[]> {
    return fetchAV('economy_macro,economy_monetary,economy_fiscal');
}

function mockNews(): NewsItem[] {
    const now = Date.now() / 1000;
    return [
        {
            id: 'm1',
            headline: 'EUR/USD climbs on softer US CPI data, eyes 1.0950 resistance',
            summary: 'The euro gained ground as inflation data came in below expectations.',
            url: 'https://www.forexfactory.com/news',
            source: 'Forex Factory',
            image: null,
            datetime: now - 3600,
            sentiment: 'bullish',
            tickers: ['EURUSD'],
        },
        {
            id: 'm2',
            headline: 'Fed holds rates steady — markets price in two cuts by year-end',
            summary: 'Federal Reserve maintains its wait-and-see approach.',
            url: 'https://www.forexfactory.com/news',
            source: 'Reuters',
            image: null,
            datetime: now - 7200,
            sentiment: 'neutral',
            tickers: ['DXY'],
        },
        {
            id: 'm3',
            headline: 'Gold breaks above $2,400 amid geopolitical tensions',
            summary: 'Safe-haven demand pushes XAU/USD to multi-month highs.',
            url: 'https://www.forexfactory.com/news',
            source: 'Bloomberg',
            image: null,
            datetime: now - 10800,
            sentiment: 'bullish',
            tickers: ['XAUUSD'],
        },
        {
            id: 'm4',
            headline: 'GBP/USD rallies on strong UK employment figures',
            summary: 'Sterling outperforms peers as jobs data surprises to the upside.',
            url: 'https://www.forexfactory.com/news',
            source: 'FXStreet',
            image: null,
            datetime: now - 14400,
            sentiment: 'bullish',
            tickers: ['GBPUSD'],
        },
        {
            id: 'm5',
            headline: 'JPY weakens further as BoJ signals no rush to hike rates',
            summary: 'Bank of Japan maintains ultra-loose monetary policy stance.',
            url: 'https://www.forexfactory.com/news',
            source: 'Nikkei',
            image: null,
            datetime: now - 18000,
            sentiment: 'bearish',
            tickers: ['USDJPY'],
        },
    ];
}
