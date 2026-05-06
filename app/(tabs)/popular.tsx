import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useState, useMemo, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trade, getTradingViewImageUrl } from '@/components/ForecastCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import Avatar from '@/components/Avatar';

const { width: SW } = Dimensions.get('window');

// ─── Feed Filter ────────────────────────────────────────────────────────────
type Filter = 'all' | 'following' | 'top';
const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Latest' },
    { key: 'following', label: 'Following' },
    { key: 'top', label: 'Top' },
];

// ─── Time helper ────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

// ─── Post Card ───────────────────────────────────────────────────────────────
type PostCardProps = {
    trade: Trade;
    isLiked: boolean;
    currentUserId?: string;
    onLike: (id: string) => void;
    onPress: (trade: Trade) => void;
    onAvatarPress: (userId: string) => void;
};

function PostCard({ trade, isLiked, currentUserId, onLike, onPress, onAvatarPress }: PostCardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const user = trade.users;
    const isProfitable = (trade.money_value || 0) >= 0;

    const handleLikePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.35, duration: 120, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
        onLike(trade.id);
    };

    return (
        <TouchableOpacity style={s.card} onPress={() => onPress(trade)} activeOpacity={0.97}>
            {/* Header */}
            <View style={s.cardHeader}>
                <TouchableOpacity style={s.userRow} onPress={() => onAvatarPress(trade.user_id)}>
                    <Avatar url={user?.avatar_url} username={user?.username ?? '?'} size={40} />
                    <View style={s.userMeta}>
                        <View style={s.nameRow}>
                            <Text style={s.userName}>@{user?.username ?? 'trader'}</Text>
                            {user?.is_verified && (
                                <MaterialIcons name="verified" size={13} color="#F5C400" />
                            )}
                        </View>
                        <Text style={s.timeText}>{timeAgo(trade.created_at)}</Text>
                    </View>
                </TouchableOpacity>

                <View style={s.badgeGroup}>
                    <View style={[s.typeBadge, { backgroundColor: trade.trade_type === 'Buy' ? '#EBF8FF' : '#FFF5F5' }]}>
                        <Text style={[s.typeBadgeText, { color: trade.trade_type === 'Buy' ? '#3182CE' : '#E53E3E' }]}>
                            {trade.trade_type}
                        </Text>
                    </View>
                    <View style={[s.symbolBadge, { backgroundColor: isProfitable ? '#ecfdf5' : '#fef2f2' }]}>
                        <Text style={[s.symbolText, { color: isProfitable ? '#059669' : '#dc2626' }]}>
                            {trade.symbol}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Notes */}
            {!!trade.notes && (
                <Text style={s.notes} numberOfLines={3}>{trade.notes}</Text>
            )}

            {/* Chart */}
            {!!trade.chart_image_url && (
                <View style={s.chartWrap}>
                    <Image
                        source={{ uri: getTradingViewImageUrl(trade.chart_image_url) || '' }}
                        style={s.chartImg}
                        resizeMode="cover"
                    />
                </View>
            )}

            {/* Footer */}
            <View style={s.cardFooter}>
                <View style={[s.plBadge, { backgroundColor: isProfitable ? '#ecfdf5' : '#fef2f2' }]}>
                    <FontAwesome
                        name={isProfitable ? 'arrow-up' : 'arrow-down'}
                        size={10}
                        color={isProfitable ? '#059669' : '#dc2626'}
                    />
                    <Text style={[s.plText, { color: isProfitable ? '#059669' : '#dc2626' }]}>
                        {isProfitable ? '+' : '-'}${Math.abs(trade.money_value || 0).toFixed(2)}
                    </Text>
                </View>

                <View style={s.actions}>
                    <TouchableOpacity style={s.actionBtn} onPress={handleLikePress}>
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <FontAwesome
                                name={isLiked ? 'heart' : 'heart-o'}
                                size={17}
                                color={isLiked ? '#ef4444' : '#bbb'}
                            />
                        </Animated.View>
                        <Text style={[s.actionCount, isLiked && { color: '#ef4444' }]}>
                            {trade.likes_count || 0}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={s.actionBtn} onPress={() => onPress(trade)}>
                        <FontAwesome name="comment-o" size={17} color="#bbb" />
                        <Text style={s.actionCount}>{trade.comments_count || 0}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function Feed() {
    const { user } = useAuth();
    const router = useRouter();

    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<Filter>('all');
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

    const fetchFollowing = useCallback(async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('follows')
            .select('followed_id')
            .eq('follower_id', user.id);
        if (data) setFollowingIds(new Set(data.map(f => f.followed_id)));
    }, [user?.id]);

    const fetchLikes = useCallback(async () => {
        if (!user?.id) return;
        const { data } = await supabase.from('likes').select('trade_id').eq('user_id', user.id);
        if (data) setLikedIds(new Set(data.map(l => l.trade_id)));
    }, [user?.id]);

    const fetchTrades = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('trades')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(60);

        if (error) { console.error(error); return; }

        const allTrades = data || [];
        if (allTrades.length === 0) { setTrades([]); return; }

        const userIds = [...new Set(allTrades.map(t => t.user_id))];
        const { data: usersData } = await supabase
            .from('users')
            .select('id, username, avatar_url, is_verified')
            .in('id', userIds);

        const userMap = (usersData || []).reduce((acc: any, u) => {
            acc[u.id] = { username: u.username, avatar_url: u.avatar_url, is_verified: u.is_verified };
            return acc;
        }, {});

        setTrades(allTrades.map(t => ({
            ...t,
            users: userMap[t.user_id] || { username: 'Trader', avatar_url: null, is_verified: false },
        })) as Trade[]);
    }, [user?.id]);

    const loadAll = useCallback(async () => {
        await Promise.all([fetchTrades(), fetchLikes(), fetchFollowing()]);
    }, [fetchTrades, fetchLikes, fetchFollowing]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadAll().finally(() => setLoading(false));
        }, [loadAll])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    }, [loadAll]);

    const filteredTrades = useMemo(() => {
        if (filter === 'following') {
            return trades.filter(t => followingIds.has(t.user_id) || t.user_id === user?.id);
        }
        if (filter === 'top') {
            return [...trades].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        }
        return trades;
    }, [trades, filter, followingIds, user?.id]);

    const handleLike = async (tradeId: string) => {
        if (!user?.id) return;
        const isLiked = likedIds.has(tradeId);

        setLikedIds(prev => {
            const next = new Set(prev);
            if (isLiked) next.delete(tradeId);
            else next.add(tradeId);
            return next;
        });
        setTrades(prev => prev.map(t =>
            t.id === tradeId ? { ...t, likes_count: (t.likes_count || 0) + (isLiked ? -1 : 1) } : t
        ));

        if (isLiked) {
            await supabase.from('likes').delete().eq('user_id', user.id).eq('trade_id', tradeId);
            await supabase.rpc('decrement_likes', { trade_id: tradeId });
        } else {
            await supabase.from('likes').insert({ user_id: user.id, trade_id: tradeId });
            await supabase.rpc('increment_likes', { trade_id: tradeId });
        }
    };

    const handleOpenModal = (trade: Trade) => {
        setSelectedTrade(trade);
        setModalVisible(true);
    };

    if (loading) {
        return (
            <View style={s.loader}>
                <ActivityIndicator size="large" color="#F5C400" />
            </View>
        );
    }

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <Text style={s.logo}>Ticksnap</Text>
                <TouchableOpacity
                    style={s.postBtn}
                    onPress={() => router.push('/(tabs)/forecast')}
                >
                    <FontAwesome name="plus" size={14} color="#1a1a1a" />
                    <Text style={s.postBtnText}>Post trade</Text>
                </TouchableOpacity>
            </View>

            {/* Filter tabs */}
            <View style={s.filterRow}>
                {FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={[s.filterTab, filter === f.key && s.filterTabActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[s.filterLabel, filter === f.key && s.filterLabelActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Feed */}
            <FlatList
                data={filteredTrades}
                keyExtractor={item => item.id}
                contentContainerStyle={s.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C400" />
                }
                ListEmptyComponent={
                    <View style={s.empty}>
                        <Text style={s.emptyIcon}>📭</Text>
                        <Text style={s.emptyTitle}>No posts yet</Text>
                        <Text style={s.emptySubtitle}>
                            {filter === 'following'
                                ? 'Follow traders to see their posts here'
                                : 'Be the first to post a trade!'}
                        </Text>
                        <TouchableOpacity
                            style={s.emptyBtn}
                            onPress={() => router.push('/(tabs)/forecast')}
                        >
                            <Text style={s.emptyBtnText}>Post your first trade →</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={({ item }) => (
                    <PostCard
                        trade={item}
                        isLiked={likedIds.has(item.id)}
                        currentUserId={user?.id}
                        onLike={handleLike}
                        onPress={handleOpenModal}
                        onAvatarPress={userId => router.push(`/user-profile?userId=${userId}`)}
                    />
                )}
            />

            <TradeDetailsModal
                visible={modalVisible}
                forecast={selectedTrade}
                onClose={() => setModalVisible(false)}
                onLike={() => selectedTrade && handleLike(selectedTrade.id)}
                isLiked={selectedTrade ? likedIds.has(selectedTrade.id) : false}
                currentUserId={user?.id}
                onUpdate={fetchTrades}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F3' },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 10,
    },
    logo: { fontSize: 24, fontWeight: '900', color: '#1a1a1a', fontStyle: 'italic', letterSpacing: -0.5 },
    postBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F5C400',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    postBtnText: { fontSize: 13, fontWeight: '800', color: '#1a1a1a' },

    // Filter
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 8,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#eee',
    },
    filterTabActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
    filterLabel: { fontSize: 13, fontWeight: '700', color: '#888' },
    filterLabelActive: { color: '#F5C400' },

    // List
    list: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },

    // Card
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    userMeta: { gap: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    userName: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
    timeText: { fontSize: 12, color: '#bbb', fontWeight: '500' },
    badgeGroup: { flexDirection: 'row', gap: 6 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
    typeBadgeText: { fontSize: 10, fontWeight: '800' },
    symbolBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
    symbolText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

    notes: { fontSize: 14, color: '#444', lineHeight: 21 },

    chartWrap: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#f5f5f5' },
    chartImg: { width: '100%', height: 190 },

    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    plBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    plText: { fontSize: 14, fontWeight: '900' },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionCount: { fontSize: 13, fontWeight: '700', color: '#aaa' },

    // Empty
    empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10 },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
    emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
    emptyBtn: {
        marginTop: 12,
        backgroundColor: '#F5C400',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    },
    emptyBtnText: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
});