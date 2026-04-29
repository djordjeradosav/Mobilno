import { Trade } from '@/components/ForecastCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import Avatar from '@/components/Avatar';

type ProfileData = {
    id: string;
    username: string;
    email: string;
    avatar_url: string | null;
    member_since: string;
    is_verified: boolean;
    subscription_tier: string;
};

type FollowedUser = {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
};

function formatMemberSince(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Profile() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [myTrades, setMyTrades] = useState<Trade[]>([]);
    const [followed, setFollowed] = useState<FollowedUser[]>([]);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

    const fetchProfile = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('users').select('*').eq('id', user.id).maybeSingle();
        if (error) console.error('[fetchProfile]', error.message);
        if (data) setProfile(data as ProfileData);
    }, [user?.id]);

    const fetchMyTrades = useCallback(async () => {
        if (!user?.id) return;
        try {
            // Fetch trades only (avoiding relationship errors)
            const { data: tradesData, error: tradesError } = await supabase
                .from('trades')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (tradesError) {
                console.error('[fetchMyTrades] Trades Fetch Error:', tradesError.message);
                return;
            }

            // Manually join with the user profile
            if (tradesData && profile) {
                const combined = tradesData.map(t => ({
                    ...t,
                    users: {
                        username: profile.username,
                        avatar_url: profile.avatar_url,
                        is_verified: profile.is_verified
                    }
                }));
                setMyTrades(combined as Trade[]);
            } else if (tradesData) {
                setMyTrades(tradesData as Trade[]);
            }
        } catch (err) {
            console.error('[fetchMyTrades] Unexpected Error:', err);
        }
    }, [user?.id, profile]);

    const fetchFollowed = useCallback(async () => {
        if (!user?.id) return;
        const { data: followingData, count: fwingCount } = await supabase
            .from('follows')
            .select('followed_id', { count: 'exact' })
            .eq('follower_id', user.id);

        const { count: fwerCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('followed_id', user.id);

        setFollowingCount(fwingCount ?? 0);
        setFollowerCount(fwerCount ?? 0);

        if (followingData && followingData.length > 0) {
            const ids = followingData.map((f: { followed_id: string }) => f.followed_id);
            const { data: usersData, error } = await supabase
                .from('users')
                .select('id, username, avatar_url, is_verified')
                .in('id', ids)
                .limit(10);
            if (error) console.error('[fetchFollowed:users]', error.message);
            if (usersData) setFollowed(usersData as FollowedUser[]);
        } else {
            setFollowed([]);
        }
    }, [user?.id]);

    const fetchLikes = useCallback(async () => {
        if (!user?.id) return;
        const { data } = await supabase
            .from('likes')
            .select('trade_id')
            .eq('user_id', user.id);
        if (data) setLikedIds(new Set(data.map(l => l.trade_id)));
    }, [user?.id]);

    const init = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchProfile(), fetchFollowed(), fetchLikes()]);
        // fetchMyTrades depends on profile, so we call it after
        await fetchMyTrades();
        setLoading(false);
    }, [fetchProfile, fetchMyTrades, fetchFollowed, fetchLikes]);

    useEffect(() => { init(); }, [init]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchProfile(), fetchFollowed(), fetchLikes()]);
        await fetchMyTrades();
        setRefreshing(false);
    }, [fetchProfile, fetchMyTrades, fetchFollowed, fetchLikes]);

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await signOut();
                    router.replace('/(auth)/welcome');
                },
            },
        ]);
    };

    const handleLike = async (tradeId: string) => {
        if (!user?.id) return;
        const isLiked = likedIds.has(tradeId);
        setLikedIds(prev => {
            const next = new Set(prev);
            if (isLiked) next.delete(tradeId);
            else next.add(tradeId);
            return next;
        });
        if (isLiked) {
            await supabase.from('likes').delete().eq('user_id', user.id).eq('trade_id', tradeId);
            await supabase.rpc('decrement_likes', { trade_id: tradeId });
        } else {
            await supabase.from('likes').insert({ user_id: user.id, trade_id: tradeId });
            await supabase.rpc('increment_likes', { trade_id: tradeId });
        }
        fetchMyTrades();
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#F5C400" />
            </View>
        );
    }

    const displayName = profile?.username ?? 'trader';
    const memberSince = profile?.member_since ? formatMemberSince(profile.member_since) : 'Recently joined';

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C400" />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity style={styles.settingsBtn} onPress={handleSignOut}>
                        <FontAwesome name="sign-out" size={20} color="#1a1a1a" />
                    </TouchableOpacity>
                </View>

                <View style={styles.profileCard}>
                    <View style={styles.avatarWrap}>
                        <Avatar url={profile?.avatar_url} username={displayName} size={80} />
                        {profile?.is_verified && (
                            <View style={styles.verifiedBadge}>
                                <MaterialIcons name="verified" size={16} color="#F5C400" />
                            </View>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.username}>@{displayName}</Text>
                            <View style={[styles.tierBadge, profile?.subscription_tier === 'pro' && styles.tierBadgePro]}>
                                <Text style={[styles.tierText, profile?.subscription_tier === 'pro' && styles.tierTextPro]}>
                                    {(profile?.subscription_tier ?? 'free').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.memberSince}>Member since {memberSince}</Text>
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statNum}>{myTrades.length}</Text>
                            <Text style={styles.statLabel}>Trades</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statNum}>{followerCount}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statNum}>{followingCount}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                    </View>
                </View>

                {myTrades.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📈 My Trades</Text>
                        <FlatList
                            horizontal
                            data={myTrades}
                            keyExtractor={(item) => item.id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.tradeCard}
                                    onPress={() => { setSelectedTrade(item); setModalVisible(true); }}
                                    activeOpacity={0.9}
                                >
                                    <Text style={styles.tradePair}>{item.symbol || 'UNKNOWN'}</Text>
                                    <Text style={[styles.tradeProfit, { color: (item.money_value || 0) >= 0 ? '#059669' : '#dc2626' }]}>
                                        {(item.money_value || 0) >= 0 ? '+' : ''}${Math.abs(item.money_value || 0).toFixed(2)}
                                    </Text>
                                    <View style={styles.tradeLikes}>
                                        <FontAwesome name="heart" size={12} color="#ef4444" />
                                        <Text style={styles.tradeLikeCount}>{item.likes_count}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {followed.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>👥 Following</Text>
                        <FlatList
                            horizontal
                            data={followed}
                            keyExtractor={(item) => item.id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 12, paddingRight: 20 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.followedUser} 
                                    onPress={() => router.push(`/user-profile?userId=${item.id}`)}
                                >
                                    <Avatar url={item.avatar_url} username={item.username} size={50} />
                                    <Text style={styles.followedName} numberOfLines={1}>@{item.username}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}
            </ScrollView>

            <TradeDetailsModal
                visible={modalVisible}
                forecast={selectedTrade}
                onClose={() => setModalVisible(false)}
                onLike={() => selectedTrade && handleLike(selectedTrade.id)}
                isLiked={selectedTrade ? likedIds.has(selectedTrade.id) : false}
                currentUserId={user?.id}
                onUpdate={fetchMyTrades}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FAFAF8' },
    scroll: { flex: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#1a1a1a' },
    settingsBtn: { padding: 8 },
    profileCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 5 },
    avatarWrap: { position: 'relative', marginBottom: 16 },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 10, padding: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    profileInfo: { alignItems: 'center', gap: 4, marginBottom: 24 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    username: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
    tierBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    tierBadgePro: { backgroundColor: '#F5C400' },
    tierText: { fontSize: 10, fontWeight: '800', color: '#888' },
    tierTextPro: { color: '#1a1a1a' },
    memberSince: { fontSize: 13, color: '#aaa', fontWeight: '500' },
    statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 20 },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statNum: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
    statLabel: { fontSize: 12, color: '#aaa', fontWeight: '600' },
    statDivider: { width: 1, height: 30, backgroundColor: '#f5f5f5' },
    section: { marginTop: 32, paddingLeft: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
    tradeCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, width: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    tradePair: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
    tradeProfit: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
    tradeLikes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tradeLikeCount: { fontSize: 12, fontWeight: '700', color: '#aaa' },
    followedUser: { alignItems: 'center', gap: 8, width: 80 },
    followedName: { fontSize: 11, fontWeight: '700', color: '#666', width: '100%', textAlign: 'center' },
});
