import { getStockNews } from '@/lib/finnhub';
import { getForexRate } from '@/lib/forex';
import { supabase } from '@/lib/supabase';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserResult = {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    subscription_tier: string;
};

type NewsItem = {
    id: number;
    headline: string;
    source: string;
    datetime: number;
};

const CURRENCY_PAIRS = [
    { from: 'EUR', to: 'USD', flag: '🇪🇺', label: 'EUR/USD' },
    { from: 'GBP', to: 'USD', flag: '🇬🇧', label: 'GBP/USD' },
    { from: 'AUD', to: 'USD', flag: '🇦🇺', label: 'AUD/USD' },
    { from: 'JPY', to: 'USD', flag: '🇯🇵', label: 'JPY/USD' },
    { from: 'CHF', to: 'USD', flag: '🇨🇭', label: 'CHF/USD' },
    { from: 'NZD', to: 'USD', flag: '🇳🇿', label: 'NZD/USD' },
];

function Avatar({ url, username, size = 44 }: { url?: string | null; username: string; size?: number }) {
    if (url) {
        return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
        <View style={[avatarStyles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[avatarStyles.initial, { fontSize: size * 0.38 }]}>
                {username?.[0]?.toUpperCase() ?? '?'}
            </Text>
        </View>
    );
}

const avatarStyles = StyleSheet.create({
    fallback: { backgroundColor: '#F5C400', alignItems: 'center', justifyContent: 'center' },
    initial: { fontWeight: '800', color: '#1a1a1a' },
});

export default function Search() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserResult[]>([]);
    const [traders, setTraders] = useState<UserResult[]>([]);
    const [rates, setRates] = useState<Record<string, string>>({});
    const [news, setNews] = useState<NewsItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [loadingRates, setLoadingRates] = useState(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch top traders
    const fetchTraders = useCallback(async () => {
        const { data } = await supabase
            .from('users')
            .select('id, username, avatar_url, is_verified, subscription_tier')
            .limit(10);
        if (data) setTraders(data as UserResult[]);
    }, []);

    // Fetch forex rates
    const fetchRates = useCallback(async () => {
        setLoadingRates(true);
        const results = await Promise.all(
            CURRENCY_PAIRS.map((p) => getForexRate(p.from, p.to))
        );
        const rateMap: Record<string, string> = {};
        CURRENCY_PAIRS.forEach((p, i) => {
            rateMap[p.label] = results[i];
        });
        setRates(rateMap);
        setLoadingRates(false);
    }, []);

    // Fetch news
    const fetchNews = useCallback(async () => {
        const data = await getStockNews('AAPL');
        setNews(data.slice(0, 5));
    }, []);

    useEffect(() => {
        fetchTraders();
        fetchRates();
        fetchNews();
    }, []);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query.trim()) {
            setResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);
        debounceRef.current = setTimeout(async () => {
            const { data } = await supabase
                .from('users')
                .select('id, username, avatar_url, is_verified, subscription_tier')
                .ilike('username', `%${query.trim()}%`)
                .limit(20);
            if (data) setResults(data as UserResult[]);
            setSearching(false);
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const showSearch = query.trim().length > 0;

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Discover</Text>
                </View>

                {/* Search bar */}
                <View style={styles.searchBar}>
                    <FontAwesome name="search" size={16} color="#aaa" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search traders..."
                        placeholderTextColor="#bbb"
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <FontAwesome name="times-circle" size={16} color="#aaa" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Search results */}
                {showSearch && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>👤 Traders</Text>
                        {searching ? (
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <ActivityIndicator color="#F5C400" />
                            </View>
                        ) : results.length === 0 ? (
                            <Text style={styles.noResults}>No traders found for "{query}"</Text>
                        ) : (
                            results.map((u) => (
                                <TouchableOpacity key={u.id} style={styles.userRow} activeOpacity={0.8}>
                                    <Avatar url={u.avatar_url} username={u.username} />
                                    <View style={styles.userInfo}>
                                        <View style={styles.userNameRow}>
                                            <Text style={styles.username}>@{u.username}</Text>
                                            {u.is_verified && (
                                                <MaterialIcons name="verified" size={14} color="#F5C400" />
                                            )}
                                        </View>
                                        <Text style={styles.tier}>{u.subscription_tier} plan</Text>
                                    </View>
                                    <TouchableOpacity style={styles.followBtn}>
                                        <Text style={styles.followBtnText}>Follow</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                {/* Currency rates - always visible */}
                {!showSearch && (
                    <>
                        <View style={styles.section}>
                            <View style={styles.sectionRow}>
                                <Text style={styles.sectionTitle}>💱 Live Rates</Text>
                                {loadingRates && <ActivityIndicator size="small" color="#F5C400" />}
                            </View>
                            <View style={styles.ratesGrid}>
                                {CURRENCY_PAIRS.map((pair) => (
                                    <View key={pair.label} style={styles.rateCard}>
                                        <Text style={styles.rateFlag}>{pair.flag}</Text>
                                        <Text style={styles.ratePair}>{pair.label}</Text>
                                        <Text style={styles.rateValue}>
                                            {rates[pair.label] ?? '—'}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Stock News */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📰 Stock News</Text>
                            {news.map((item) => (
                                <View key={item.id} style={styles.newsItem}>
                                    <View style={styles.newsSource}>
                                        <Text style={styles.newsSourceText}>{item.source}</Text>
                                    </View>
                                    <Text style={styles.newsHeadline} numberOfLines={2}>
                                        {item.headline}
                                    </Text>
                                    <Text style={styles.newsTime}>
                                        {Math.round((Date.now() / 1000 - item.datetime) / 3600)}h ago
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Top Traders horizontal */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>🏆 Top Traders</Text>
                            <FlatList
                                horizontal
                                data={traders}
                                keyExtractor={(item) => item.id}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.tradersRow}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.traderCard} activeOpacity={0.85}>
                                        <Avatar url={item.avatar_url} username={item.username} size={52} />
                                        {item.is_verified && (
                                            <View style={styles.verifiedBadge}>
                                                <MaterialIcons name="verified" size={14} color="#F5C400" />
                                            </View>
                                        )}
                                        <Text style={styles.traderName} numberOfLines={1}>
                                            @{item.username}
                                        </Text>
                                        <TouchableOpacity style={styles.traderFollowBtn}>
                                            <Text style={styles.traderFollowText}>Follow</Text>
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    scroll: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1a1a1a',
        letterSpacing: -0.5,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 4,
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '500',
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 20,
        gap: 12,
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
    },
    noResults: {
        fontSize: 14,
        color: '#aaa',
        fontWeight: '500',
        paddingVertical: 16,
        textAlign: 'center',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    userInfo: { flex: 1, gap: 3 },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    username: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    tier: { fontSize: 12, color: '#aaa', fontWeight: '500', textTransform: 'capitalize' },
    followBtn: {
        backgroundColor: '#1a1a1a',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    followBtnText: { fontSize: 13, fontWeight: '700', color: '#F5C400' },
    ratesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    rateCard: {
        width: '30%',
        flexGrow: 1,
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    rateFlag: { fontSize: 24 },
    ratePair: { fontSize: 11, fontWeight: '700', color: '#888', letterSpacing: 0.3 },
    rateValue: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
    newsItem: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    newsSource: {
        alignSelf: 'flex-start',
        backgroundColor: '#f0f0ee',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    newsSourceText: { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 0.5 },
    newsHeadline: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', lineHeight: 21 },
    newsTime: { fontSize: 12, color: '#aaa', fontWeight: '500' },
    tradersRow: {
        gap: 12,
        paddingBottom: 24,
    },
    traderCard: {
        width: 100,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        position: 'relative',
    },
    verifiedBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    traderName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1a1a1a',
        textAlign: 'center',
    },
    traderFollowBtn: {
        backgroundColor: '#F5C400',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    traderFollowText: { fontSize: 12, fontWeight: '700', color: '#1a1a1a' },
});