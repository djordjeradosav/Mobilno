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
    followers_count: number;
    following_count: number;
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

    const [userData, setUserData] = useState<UserData | null>(null);
    const [userPosts, setUserPosts] = useState<Forecast[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

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
            .from('forecasts')
            .select('*, users!forecasts_user_id_fkey(username, avatar_url, is_verified)')
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

    const fetchLikes = useCallback(async () => {
        if (!currentUser?.id) return;
        const { data } = await supabase
            .from('likes')
            .select('forecast_id')
            .eq('user_id', currentUser.id);
        if (data) setLikedIds(new Set(data.map(l => l.forecast_id)));
    }, [currentUser?.id]);

    const init = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchUserData(), fetchUserPosts(), fetchFollowStatus(), fetchLikes()]);
        setLoading(false);
    }, [fetchUserData, fetchUserPosts, fetchFollowStatus, fetchLikes]);

    useEffect(() => { init(); }, [init]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchUserData(), fetchUserPosts(), fetchFollowStatus(), fetchLikes()]);
        setRefreshing(false);
    }, [fetchUserData, fetchUserPosts, fetchFollowStatus, fetchLikes]);

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

    const handleLike = async (forecastId: string) => {
        if (!currentUser?.id) return;
        const isLiked = likedIds.has(forecastId);
        setLikedIds(prev => {
            const next = new Set(prev);
            if (isLiked) next.delete(forecastId);
            else next.add(forecastId);
            return next;
        });
        if (isLiked) {
            await supabase.from('likes').delete().eq('user_id', currentUser.id).eq('forecast_id', forecastId);
            await supabase.rpc('decrement_likes', { forecast_id: forecastId });
        } else {
            await supabase.from('likes').insert({ user_id: currentUser.id, forecast_id: forecastId });
            await supabase.rpc('increment_likes', { forecast_id: forecastId });
        }
        fetchUserPosts();
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#F5C400" />
            </View>
        );
    }

    if (!userData) {
        return (
            <SafeAreaView style={styles.root} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <FontAwesome name="chevron-left" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>User not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const displayName = userData.username ?? 'trader';
    const memberSince = userData.member_since ? formatMemberSince(userData.member_since) : 'Recently joined';

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C400" />}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <FontAwesome name="chevron-left" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{displayName}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.profileCard}>
                    <View style={styles.avatarWrap}>
                        <Avatar url={userData.avatar_url} username={displayName} size={80} />
                        {userData.is_verified && (
                            <View style={styles.verifiedBadge}>
                                <MaterialIcons name="verified" size={16} color="#F5C400" />
                            </View>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.username}>@{displayName}</Text>
                            <View style={[styles.tierBadge, userData.subscription_tier === 'pro' && styles.tierBadgePro]}>
                                <Text style={[styles.tierText, userData.subscription_tier === 'pro' && styles.tierTextPro]}>
                                    {(userData.subscription_tier ?? 'free').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.memberSince}>Member since {memberSince}</Text>
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statNum}>{userPosts.length}</Text>
                            <Text style={styles.statLabel}>Posts</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statNum}>{userData.followers_count}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statNum}>{userData.following_count}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                    </View>

                    {currentUser?.id !== userData.id && (
                        <TouchableOpacity
                            style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                            onPress={handleToggleFollow}
                        >
                            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {userPosts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📈 Recent Posts</Text>
                        {userPosts.map((post) => (
                            <TouchableOpacity
                                key={post.id}
                                style={styles.postCard}
                                onPress={() => { setSelectedForecast(post); setModalVisible(true); }}
                                activeOpacity={0.9}
                            >
                                <View style={styles.postHeader}>
                                    <Text style={styles.postPair}>{post.currency_pair}</Text>
                                    <View style={[styles.profitBadge, { backgroundColor: post.profit >= 0 ? '#ecfdf5' : '#fef2f2' }]}>
                                        <Text style={[styles.postProfit, { color: post.profit >= 0 ? '#059669' : '#dc2626' }]}>
                                            {post.profit >= 0 ? '+' : ''}{post.profit.toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.postContent} numberOfLines={2}>{post.content}</Text>
                                <View style={styles.postFooter}>
                                    <View style={styles.postStat}>
                                        <FontAwesome name="heart-o" size={12} color="#ef4444" />
                                        <Text style={styles.postStatText}>{post.likes_count}</Text>
                                    </View>
                                    <View style={styles.postStat}>
                                        <FontAwesome name="comment-o" size={12} color="#999" />
                                        <Text style={styles.postStatText}>{post.comments_count || 0}</Text>
                                    </View>
                                    <Text style={styles.postDate}>{new Date(post.created_at).toLocaleDateString()}</Text>
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
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    loader: { flex: 1, backgroundColor: '#F5F5F3', alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
    profileCard: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    avatarWrap: { position: 'relative', marginBottom: 16 },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 10, padding: 2 },
    profileInfo: { alignItems: 'center', gap: 4, marginBottom: 24 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    username: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
    tierBadge: { backgroundColor: '#f0f0ee', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    tierBadgePro: { backgroundColor: '#F5C400' },
    tierText: { fontSize: 10, fontWeight: '800', color: '#888' },
    tierTextPro: { color: '#1a1a1a' },
    memberSince: { fontSize: 13, color: '#aaa', fontWeight: '500' },
    statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 20, marginBottom: 20 },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statNum: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
    statLabel: { fontSize: 12, color: '#aaa', fontWeight: '600' },
    statDivider: { width: 1, height: 24, backgroundColor: '#f5f5f5' },
    followBtn: { backgroundColor: '#F5C400', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, width: '100%', alignItems: 'center' },
    followBtnActive: { backgroundColor: '#f0f0ee' },
    followBtnText: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
    followBtnTextActive: { color: '#888' },
    section: { marginTop: 32, paddingHorizontal: 20, marginBottom: 32 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
    postCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    postPair: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
    profitBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    postProfit: { fontSize: 14, fontWeight: '900' },
    postContent: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },
    postFooter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    postStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    postStatText: { fontSize: 12, color: '#666', fontWeight: '600' },
    postDate: { fontSize: 12, color: '#bbb', fontWeight: '500', marginLeft: 'auto' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, color: '#aaa', fontWeight: '600' },
});