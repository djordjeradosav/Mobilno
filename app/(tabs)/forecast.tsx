import ForecastCard, { Forecast } from '@/components/ForecastCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import { useUser } from '@clerk/clerk-expo';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const FILTER_OPTIONS = ['All', 'EUR/USD', 'GBP/USD', 'AUD/USD', 'XAU/USD', 'BTC/USD'];

export default function ForecastFeed() {
    const { user } = useUser();
    const router = useRouter();
    const [forecasts, setForecasts] = useState<Forecast[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
    const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const subscriptionRef = useRef<any>(null);

    const fetchForecasts = useCallback(async () => {
        let query = supabase
            .from('forecasts')
            .select('*, users(username, avatar_url, is_verified)')
            .order('created_at', { ascending: false })
            .limit(30);

        if (activeFilter !== 'All') {
            query = query.eq('currency_pair', activeFilter);
        }

        const { data } = await query;
        if (data) setForecasts(data as Forecast[]);
    }, [activeFilter]);

    const fetchLikes = useCallback(async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('likes')
            .select('forecast_id')
            .eq('user_id', user.id);
        if (data) setLikedIds(new Set(data.map((l: any) => l.forecast_id)));
    }, [user?.id]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchForecasts(), fetchLikes()]);
            setLoading(false);
        };
        init();
    }, [fetchForecasts, fetchLikes]);

    // Real-time subscription
    useEffect(() => {
        subscriptionRef.current = supabase
            .channel('forecasts-feed')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'forecasts' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        fetchForecasts();
                    } else if (payload.eventType === 'UPDATE') {
                        setForecasts((prev) =>
                            prev.map((f) =>
                                f.id === (payload.new as Forecast).id
                                    ? { ...f, ...(payload.new as Forecast) }
                                    : f
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setForecasts((prev) =>
                            prev.filter((f) => f.id !== (payload.old as any).id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            subscriptionRef.current?.unsubscribe();
        };
    }, [fetchForecasts]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchForecasts();
        setRefreshing(false);
    }, [fetchForecasts]);

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

    const ListHeader = (
        <>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Forecast Feed</Text>
                <TouchableOpacity
                    style={styles.postBtn}
                    onPress={() => router.push('/post-forecast' as any)}
                    activeOpacity={0.85}
                >
                    <FontAwesome name="plus" size={14} color="#1a1a1a" />
                    <Text style={styles.postBtnText}>Post</Text>
                </TouchableOpacity>
            </View>

            {/* Filter chips */}
            <FlatList
                horizontal
                data={FILTER_OPTIONS}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersRow}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
                        onPress={() => setActiveFilter(item)}
                    >
                        <Text
                            style={[styles.filterText, activeFilter === item && styles.filterTextActive]}
                        >
                            {item}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#F5F5F3', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#F5C400" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <FlatList
                data={forecasts}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={ListHeader}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#F5C400"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialIcons name="trending-up" size={48} color="#ddd" />
                        <Text style={styles.emptyTitle}>No forecasts yet</Text>
                        <Text style={styles.emptySubtitle}>
                            {activeFilter !== 'All'
                                ? `No ${activeFilter} forecasts found`
                                : 'Be the first to share a trade forecast!'}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <ForecastCard
                        forecast={item}
                        onPress={() => openModal(item)}
                        onLike={() => handleLike(item.id)}
                        onWatch={() => handleWatch(item.id)}
                        isLiked={likedIds.has(item.id)}
                        isWatched={watchedIds.has(item.id)}
                    />
                )}
            />

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
    list: { paddingBottom: 32 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1a1a1a',
        letterSpacing: -0.5,
    },
    postBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F5C400',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    postBtnText: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
    filtersRow: {
        paddingHorizontal: 16,
        gap: 8,
        paddingBottom: 16,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0ee',
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: '#1a1a1a',
        borderColor: '#1a1a1a',
    },
    filterText: { fontSize: 13, fontWeight: '700', color: '#888' },
    filterTextActive: { color: '#F5C400' },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 80,
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1a1a1a',
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: '#aaa',
        textAlign: 'center',
        lineHeight: 22,
    },
});