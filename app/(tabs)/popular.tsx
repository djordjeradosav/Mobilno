import ForecastCard, { Forecast } from '@/components/ForecastCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import React, { useCallback, useEffect, useState } from 'react';
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

export default function Popular() {
    const { user } = useAuth();
    const [forecasts, setForecasts] = useState<Forecast[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'followed' | 'all'>('all');
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchLikes = useCallback(async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('likes')
            .select('forecast_id')
            .eq('user_id', user.id);
        if (data) setLikedIds(new Set(data.map(l => l.forecast_id)));
    }, [user?.id]);

    const fetchForecasts = useCallback(async () => {
        if (!user?.id) return;

        let query = supabase
            .from('forecasts')
            .select('*, users!forecasts_user_id_fkey(username, avatar_url, is_verified)');

        if (activeTab === 'followed') {
            // Get IDs of users being followed
            const { data: followingData } = await supabase
                .from('follows')
                .select('followed_id')
                .eq('follower_id', user.id);

            const followedIds = followingData?.map(f => f.followed_id) || [];
            if (followedIds.length > 0) {
                query = query.in('user_id', followedIds);
            } else {
                setForecasts([]);
                setLoading(false);
                return;
            }
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) console.error('[fetchForecasts]', error.message);
        if (data) setForecasts(data as Forecast[]);
        setLoading(false);
    }, [user?.id, activeTab]);

    useEffect(() => {
        setLoading(true);
        fetchForecasts();
        fetchLikes();
    }, [fetchForecasts, fetchLikes]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchForecasts(), fetchLikes()]);
        setRefreshing(false);
    }, [fetchForecasts, fetchLikes]);

    const handleLike = async (forecastId: string) => {
        if (!user?.id) return;
        const isLiked = likedIds.has(forecastId);

        setLikedIds(prev => {
            const next = new Set(prev);
            if (isLiked) next.delete(forecastId);
            else next.add(forecastId);
            return next;
        });

        if (isLiked) {
            await supabase.from('likes').delete().eq('user_id', user.id).eq('forecast_id', forecastId);
            await supabase.rpc('decrement_likes', { forecast_id: forecastId });
        } else {
            await supabase.from('likes').insert({ user_id: user.id, forecast_id: forecastId });
            await supabase.rpc('increment_likes', { forecast_id: forecastId });
        }
    };

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Ticksnap Feed</Text>
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                        onPress={() => setActiveTab('all')}
                    >
                        <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>Explore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'followed' && styles.tabActive]}
                        onPress={() => setActiveTab('followed')}
                    >
                        <Text style={[styles.tabText, activeTab === 'followed' && styles.tabTextActive]}>Following</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#F5C400" />
                </View>
            ) : (
                <FlatList
                    data={forecasts}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C400" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'followed' ? "You're not following anyone yet" : "No forecasts found"}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeTab === 'followed' ? "Follow other traders to see their posts here!" : "Be the first to share a trade!"}
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <ForecastCard
                            forecast={item}
                            isLiked={likedIds.has(item.id)}
                            onLike={() => handleLike(item.id)}
                            onPress={() => { setSelectedForecast(item); setModalVisible(true); }}
                        />
                    )}
                />
            )}

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
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
    tabs: { flexDirection: 'row', gap: 16, marginTop: 16 },
    tab: { paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#F5C400' },
    tabText: { fontSize: 15, fontWeight: '700', color: '#888' },
    tabTextActive: { color: '#1a1a1a' },
    list: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
    emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
    emptySubtitle: { fontSize: 14, color: '#aaa', textAlign: 'center', marginTop: 8, lineHeight: 20 },
});