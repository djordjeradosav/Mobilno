import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeContext';
import Colors from '@/constants/Colors';
import { Forecast } from '@/components/ForecastCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';

type UserData = {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
    member_since: string;
    is_verified: boolean;
    subscription_tier: string;
};

function Avatar({ url, username, size = 80 }: { url?: string | null; username: string; size?: number }) {
    if (url) {
        return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F5C400', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: size * 0.4, fontWeight: '800', color: '#1a1a1a' }}>
                {username?.[0]?.toUpperCase() ?? '?'}
            </Text>
        </View>
    );
}

function formatMemberSince(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function UserProfile() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { userId } = useLocalSearchParams();
    const { colorScheme } = useTheme();
    const C = Colors[colorScheme];

    const [userData, setUserData] = useState<UserData | null>(null);
    const [userPosts, setUserPosts] = useState<Forecast[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const fetchUserData = useCallback(async () => {
        if (!userId || typeof userId !== 'string') return;
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) console.error('[fetchUserData]', error.message);
        if (data) setUserData(data as UserData);
    }, [userId]);

    const fetchUserPosts = useCallback(async () => {
        if (!userId || typeof userId !== 'string') return;
        const { data, error } = await supabase
            .from('trades')
            .select('*, users!trades_user_id_fkey(username, avatar_url, is_verified)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) console.error('[fetchUserPosts]', error.message);
        if (data) setUserPosts(data as Forecast[]);
    }, [userId]);

    const fetchFollowStatus = useCallback(async () => {
        if (!currentUser?.id || !userId || typeof userId !== 'string') return;
        const { data, error } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', currentUser.id)
            .eq('followed_id', userId)
            .maybeSingle();

        if (error) console.error('[fetchFollowStatus]', error.message);
        setIsFollowing(!!data);
    }, [currentUser?.id, userId]);

    const fetchFollowCounts = useCallback(async () => {
        if (!userId || typeof userId !== 'string') return;
        const [followerRes, followingRes] = await Promise.all([
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', userId),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        ]);
        setFollowersCount((followerRes as any).count ?? 0);
        setFollowingCount((followingRes as any).count ?? 0);
    }, [userId]);

    const fetchLikes = useCallback(async () => {
        if (!currentUser?.id) return;
        const { data } = await supabase
            .from('likes')
            .select('trade_id')
            .eq('user_id', currentUser.id);
        if (data) setLikedIds(new Set(data.map((l: { trade_id: string }) => l.trade_id)));
    }, [currentUser?.id]);

    const init = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchUserData(), fetchUserPosts(), fetchFollowStatus(), fetchFollowCounts(), fetchLikes()]);
        setLoading(false);
    }, [fetchUserData, fetchUserPosts, fetchFollowStatus, fetchFollowCounts, fetchLikes]);

    useEffect(() => { init(); }, [init]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchUserData(), fetchUserPosts(), fetchFollowStatus(), fetchFollowCounts(), fetchLikes()]);
        setRefreshing(false);
    }, [fetchUserData, fetchUserPosts, fetchFollowStatus, fetchFollowCounts, fetchLikes]);

    const handleToggleFollow = async () => {
        if (!currentUser?.id || !userId || typeof userId !== 'string') return;

        setIsFollowing(!isFollowing);

        if (isFollowing) {
            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', currentUser.id)
                .eq('followed_id', userId);
            if (error) {
                Alert.alert('Error', 'Could not unfollow');
                setIsFollowing(true);
            }
        } else {
            const { error } = await supabase
                .from('follows')
                .insert({ follower_id: currentUser.id, followed_id: userId });
            if (error) {
                Alert.alert('Error', 'Could not follow');
                setIsFollowing(false);
            }
        }
    };

    const handleLike = async (tradeId: string) => {
        if (!currentUser?.id) return;
        const isLiked = likedIds.has(tradeId);
        setLikedIds(prev => {
            const next = new Set(prev);
            if (isLiked) next.delete(tradeId);
            else next.add(tradeId);
            return next;
        });
        if (isLiked) {
            await supabase.from('likes').delete().eq('user_id', currentUser.id).eq('trade_id', tradeId);
            await supabase.rpc('decrement_likes', { trade_id: tradeId });
        } else {
            await supabase.from('likes').insert({ user_id: currentUser.id, trade_id: tradeId });
            await supabase.rpc('increment_likes', { trade_id: tradeId });
        }
        fetchUserPosts();
    };

    if (loading) {
        return (
            <View style={[styles.loader, { backgroundColor: C.background }]}>
                <ActivityIndicator size="large" color={C.accent} />
            </View>
        );
    }

    if (!userData) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: C.background }]} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <FontAwesome name="chevron-left" size={24} color={C.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: C.text }]}>User not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const displayName = userData.username ?? 'trader';
    const memberSince = userData.member_since ? formatMemberSince(userData.member_since) : 'Recently joined';

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: C.background }]} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <FontAwesome name="chevron-left" size={24} color={C.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: C.text }]}>{displayName}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={[styles.profileCard, { backgroundColor: C.card, shadowColor: C.text }]}>
                    <View style={styles.avatarWrap}>
                        <Avatar url={userData.avatar_url} username={displayName} size={80} />
                        {userData.is_verified && (
                            <View style={[styles.verifiedBadge, { backgroundColor: C.card }]}>
                                <MaterialIcons name="verified" size={16} color={C.accent} />
                            </View>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.username, { color: C.text }]}>@{displayName}</Text>
                            <View style={[styles.tierBadge, { backgroundColor: C.surface }, userData.subscription_tier === 'pro' && { backgroundColor: C.accent }]}>
                                <Text style={[styles.tierText, { color: C.textMuted }, userData.subscription_tier === 'pro' && { color: C.textInverse }]}>
                                    {(userData.subscription_tier ?? 'free').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.memberSince, { color: C.textMuted }]}>Member since {memberSince}</Text>
                    </View>
                    <View style={[styles.statsRow, { backgroundColor: C.surface, borderTopColor: C.border }]}>
                        <View style={styles.stat}>
                            <Text style={[styles.statNum, { color: C.text }]}>{userPosts.length}</Text>
                            <Text style={[styles.statLabel, { color: C.textMuted }]}>Posts</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: C.border }]} />
                        <View style={styles.stat}>
                            <Text style={[styles.statNum, { color: C.text }]}>{followersCount}</Text>
                            <Text style={[styles.statLabel, { color: C.textMuted }]}>Followers</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: C.border }]} />
                        <View style={styles.stat}>
                            <Text style={[styles.statNum, { color: C.text }]}>{followingCount}</Text>
                            <Text style={[styles.statLabel, { color: C.textMuted }]}>Following</Text>
                        </View>
                    </View>

                    {currentUser?.id !== userData.id && (
                        <TouchableOpacity
                            style={[styles.followBtn, { backgroundColor: C.accent }, isFollowing && { backgroundColor: C.surface }]}
                            onPress={handleToggleFollow}
                        >
                            <Text style={[styles.followBtnText, { color: C.textInverse }, isFollowing && { color: C.textMuted }]}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {userPosts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: C.text }]}>📈 Recent Posts</Text>
                        {userPosts.map((post) => (
                            <TouchableOpacity
                                key={post.id}
                                style={[styles.postCard, { backgroundColor: C.card, shadowColor: C.text }]}
                                onPress={() => { setSelectedForecast(post); setModalVisible(true); }}
                                activeOpacity={0.9}
                            >
                                <View style={styles.postHeader}>
                                    <Text style={[styles.postPair, { color: C.text }]}>{post.symbol || post.currency_pair}</Text>
                                    <View style={[styles.profitBadge, { backgroundColor: (post.money_value ?? 0) >= 0 ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)' }]}>
                                        <Text style={[styles.postProfit, { color: (post.money_value ?? 0) >= 0 ? '#0ECB81' : '#F6465D' }]}>
                                            {(post.money_value ?? 0) >= 0 ? '+' : ''}{(post.money_value ?? 0).toFixed(2)}$
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.postContent, { color: C.textSecondary }]} numberOfLines={2}>{post.notes || post.content}</Text>
                                <View style={styles.postFooter}>
                                    <View style={styles.postStat}>
                                        <FontAwesome name="heart-o" size={12} color="#F6465D" />
                                        <Text style={[styles.postStatText, { color: C.textSecondary }]}>{post.likes_count}</Text>
                                    </View>
                                    <View style={styles.postStat}>
                                        <FontAwesome name="comment-o" size={12} color={C.iconDefault} />
                                        <Text style={[styles.postStatText, { color: C.textSecondary }]}>{post.comments_count || 0}</Text>
                                    </View>
                                    <Text style={[styles.postDate, { color: C.textMuted }]}>{new Date(post.created_at).toLocaleDateString()}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            <TradeDetailsModal
                visible={modalVisible}
                forecast={selectedForecast}
                onClose={() => setModalVisible(false)}
                onLike={handleLike}
                isLiked={selectedForecast ? likedIds.has(selectedForecast.id) : false}
                currentUserId={currentUser?.id}
                onUpdate={fetchUserPosts}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    profileCard: { marginHorizontal: 20, borderRadius: 24, padding: 20, alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    avatarWrap: { position: 'relative', marginBottom: 16 },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, borderRadius: 10, padding: 2 },
    profileInfo: { alignItems: 'center', gap: 4, marginBottom: 24 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    username: { fontSize: 20, fontWeight: '800' },
    tierBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    tierText: { fontSize: 10, fontWeight: '800' },
    memberSince: { fontSize: 13, fontWeight: '500' },
    statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, paddingTop: 20, marginBottom: 20, borderRadius: 12 },
    stat: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8 },
    statNum: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 12, fontWeight: '600' },
    statDivider: { width: 1, height: 24, alignSelf: 'center' },
    followBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, width: '100%', alignItems: 'center' },
    followBtnText: { fontSize: 14, fontWeight: '800' },
    section: { marginTop: 32, paddingHorizontal: 20, marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
    postCard: { borderRadius: 20, padding: 16, marginBottom: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    postPair: { fontSize: 16, fontWeight: '800' },
    profitBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    postProfit: { fontSize: 14, fontWeight: '900' },
    postContent: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
    postFooter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    postStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    postStatText: { fontSize: 12, fontWeight: '600' },
    postDate: { fontSize: 12, fontWeight: '500', marginLeft: 'auto' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, fontWeight: '600' },
});