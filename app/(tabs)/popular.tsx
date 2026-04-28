import ForecastCard, { Forecast } from '@/components/ForecastCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import { getMarketNews } from '@/lib/finnhub';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/clerk-expo';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'big-bag', label: 'Big Bag', emoji: '💰', color: '#fef9c3' },
    { id: 'racks', label: 'Racks', emoji: '📊', color: '#dbeafe' },
    { id: 'ticker', label: 'Ticker', emoji: '📈', color: '#dcfce7' },
    { id: 'wings', label: 'Wings', emoji: '🦅', color: '#fce7f3' },
];

type NewsItem = {
    id: number;
    headline: string;
    source: string;
    datetime: number;
};

function NewsCarousel({ items }: { items: NewsItem[] }) {
    return (
        <FlatList
            horizontal
            data={items}
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            renderItem={({ item }) => (
                <View style={newsStyles.card}>
                    <View style={newsStyles.sourceBadge}>
                        <Text style={newsStyles.source}>{item.source}</Text>
                    </View>
                    <Text style={newsStyles.headline} numberOfLines={3}>
                        {item.headline}
                    </Text>
                    <Text style={newsStyles.time}>
                        {Math.round((Date.now() / 1000 - item.datetime) / 3600)}h ago
                    </Text>
                </View>
            )}
            snapToInterval={width - 64}
            decelerationRate="fast"
        />
    );
}

const newsStyles = StyleSheet.create({
    card: {
        width: width - 72,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 20,
        gap: 10,
        justifyContent: 'space-between',
    },
    sourceBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#F5C400',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    source: { fontSize: 11, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.5 },
    headline: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        lineHeight: 23,
    },
    time: { fontSize: 12, color: '#888', fontWeight: '500' },
});

export default function Popular() {
    const { user } = useUser();
    const [forecasts, setForecasts] = useState<Forecast[]>([]);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('big-bag');
    const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
    const [modalVisible, setModalVisible] = useState(false);

    const fetchForecasts = useCallback(async () => {
        const { data } = await supabase
            .from('forecasts')
            .select('*, users(username, avatar_url, is_verified)')
            .order('likes_count', { ascending: false })
            .limit(20);
        if (data) setForecasts(data as Forecast[]);
    }, []);

    const fetchNews = useCallback(async () => {
        const data = await getMarketNews();
        setNews(data);
    }, []);

    const fetchLikes = useCallback(async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('likes')
            .select('forecast_id')
            .eq('user_id', user.id);
        if (data) setLikedIds(new Set(data.map((l: any) => l.forecast_id)));
    }, [user?.id]);

    const init = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchForecasts(), fetchNews(), fetchLikes()]);
        setLoading(false);
    }, [fetchForecasts, fetchNews, fetchLikes]);

    useEffect(() => {
        init();
    }, [init]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchForecasts(), fetchNews()]);
        setRefreshing(false);
    }, [fetchForecasts, fetchNews]);

    const handleLike = useCallback(
        async (forecastId: string) => {
            if (!user?.id) return;
            const liked = likedIds.has(forecastId);

            setLikedIds((prev) => {
                const next = new Set(prev);
                liked ? next.delete(forecastId) : next.add(forecastId);
                return next;
            });
            setForecasts((prev) =>
                prev.map((f) =>
                    f.id === forecastId
                        ? { ...f, likes_count: f.likes_count + (liked ? -1 : 1) }
                        : f
                )
            );

            if (liked) {
                await supabase.from('likes').delete().eq('user_id', user.id).eq('forecast_id', forecastId);
                await supabase.rpc('decrement_likes', { forecast_id: forecastId });
            } else {
                await supabase.from('likes').insert({ user_id: user.id, forecast_id: forecastId });
                await supabase.rpc('increment_likes', { forecast_id: forecastId });
            }
        },
        [user?.id, likedIds]
    );

    const handleWatch = useCallback((forecastId: string) => {
        setWatchedIds((prev) => {
            const next = new Set(prev);
            prev.has(forecastId) ? next.delete(forecastId) : next.add(forecastId);
            return next;
        });
    }, []);

    const openModal = useCallback((forecast: Forecast) => {
        setSelectedForecast(forecast);
        setModalVisible(true);
    }, []);

    // Best Today (horizontal scroll of top 5)
    const bestToday = forecasts.slice(0, 5);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F5F5F3', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#F5C400" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#F5C400"
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>
                            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'} 👋
                        </Text>
                        <Text style={styles.headerTitle}>Popular Today</Text>
                    </View>
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                </View>

                {/* News Carousel */}
                <Text style={styles.sectionTitle}>📰 Market News</Text>
                {news.length > 0 && <NewsCarousel items={news} />}

                {/* Categories */}
                <View style={styles.categoriesRow}>
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.categoryBtn,
                                { backgroundColor: selectedCategory === cat.id ? '#1a1a1a' : cat.color },
                            ]}
                            onPress={() => setSelectedCategory(cat.id)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                            <Text
                                style={[
                                    styles.categoryLabel,
                                    { color: selectedCategory === cat.id ? '#F5C400' : '#1a1a1a' },
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Best Today */}
                {bestToday.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>🏆 Best Today</Text>
                        <FlatList
                            horizontal
                            data={bestToday}
                            keyExtractor={(item) => item.id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.miniCard}
                                    onPress={() => openModal(item)}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.miniCardHeader}>
                                        <Text style={styles.miniPair}>{item.currency_pair}</Text>
                                        <Text
                                            style={[
                                                styles.miniProfit,
                                                { color: item.profit >= 0 ? '#059669' : '#dc2626' },
                                            ]}
                                        >
                                            {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(1)}%
                                        </Text>
                                    </View>
                                    <Text style={styles.miniUser} numberOfLines={1}>
                                        @{item.users?.username}
                                    </Text>
                                    <View style={styles.miniLikes}>
                                        <Text style={styles.miniLikeIcon}>❤️</Text>
                                        <Text style={styles.miniLikeCount}>{item.likes_count}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </>
                )}

                {/* All forecasts */}
                <Text style={styles.sectionTitle}>🔥 All Forecasts</Text>
                <View style={styles.feedList}>
                    {forecasts.map((item) => (
                        <ForecastCard
                            key={item.id}
                            forecast={item}
                            onPress={() => openModal(item)}
                            onLike={() => handleLike(item.id)}
                            onWatch={() => handleWatch(item.id)}
                            isLiked={likedIds.has(item.id)}
                            isWatched={watchedIds.has(item.id)}
                        />
                    ))}
                    {forecasts.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>📊</Text>
                            <Text style={styles.emptyText}>No forecasts yet. Be the first!</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            <TradeDetailsModal
                visible={modalVisible}
                forecast={selectedForecast}
                onClose={() => setModalVisible(false)}
                onLike={handleLike}
                isLiked={selectedForecast ? likedIds.has(selectedForecast.id) : false}
                currentUserId={user?.id}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    scroll: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    greeting: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 2 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    liveText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 1 },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
        paddingHorizontal: 20,
        marginTop: 24,
        marginBottom: 12,
    },
    categoriesRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        marginTop: 20,
    },
    categoryBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 4,
    },
    categoryEmoji: { fontSize: 20 },
    categoryLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    miniCard: {
        width: 140,
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 14,
        gap: 6,
    },
    miniCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    miniPair: { fontSize: 13, fontWeight: '800', color: '#fff' },
    miniProfit: { fontSize: 14, fontWeight: '800' },
    miniUser: { fontSize: 12, color: '#888', fontWeight: '600' },
    miniLikes: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    miniLikeIcon: { fontSize: 12 },
    miniLikeCount: { fontSize: 12, color: '#666', fontWeight: '600' },
    feedList: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 24,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyEmoji: { fontSize: 40 },
    emptyText: { fontSize: 16, color: '#aaa', fontWeight: '600' },
});