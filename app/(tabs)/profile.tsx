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
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '@/components/Avatar';
import { syncUserToSupabase } from '@/lib/syncUser';

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

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
    return (
        <View style={styles.statCard}>
            <Text style={[styles.statNum, color ? { color } : {}]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
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

        // Sync current user
        try {
            await syncUserToSupabase(user.id, user.email?.split('@')[0] || 'trader', user.email || '');
        } catch (e) {
            console.error('User sync failed', e);
        }

        const { data, error } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
        if (error) console.error('[fetchProfile]', error.message);
        if (data) setProfile(data as ProfileData);
    }, [user?.id]);

    const fetchMyTrades = useCallback(async () => {
        if (!user?.id) return;
        const { data: tradesData, error } = await supabase
            .from('trades')
            .select('*, users!trades_user_id_fkey(username, avatar_url, is_verified)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) { console.error('[fetchMyTrades]', error.message); return; }
        setMyTrades((tradesData || []) as Trade[]);
    }, [user?.id]);

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
            const { data: usersData } = await supabase
                .from('users')
                .select('id, username, avatar_url, is_verified')
                .in('id', ids)
                .limit(10);
            if (usersData) setFollowed(usersData as FollowedUser[]);
        } else {
            setFollowed([]);
        }
    }, [user?.id]);

    const fetchLikes = useCallback(async () => {
        if (!user?.id) return;
        const { data } = await supabase.from('likes').select('trade_id').eq('user_id', user.id);
        if (data) setLikedIds(new Set(data.map(l => l.trade_id)));
    }, [user?.id]);

    const init = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchProfile(), fetchFollowed(), fetchLikes()]);
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
                <ActivityIndicator size="large" color="#F0B90B" />
            </View>
        );
    }

    const displayName = profile?.username ?? 'trader';
    const memberSince = profile?.member_since ? formatMemberSince(profile.member_since) : 'Recently joined';
    const totalPL = myTrades.reduce((sum, t) => sum + (t.money_value || 0), 0);
    const winRate = myTrades.length
        ? Math.round((myTrades.filter(t => (t.money_value || 0) > 0).length / myTrades.length) * 100)
        : 0;

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#F0B90B"
                        colors={['#F0B90B']}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                        <FontAwesome name="sign-out" size={18} color="#848E9C" />
                    </TouchableOpacity>
                </View>

                <View style={styles.dividerLine} />

                {/* Profile card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarSection}>
                        <Avatar url={profile?.avatar_url} username={displayName} size={72} />
                        {profile?.is_verified && (
                            <View style={styles.verifiedBadge}>
                                <MaterialIcons name="verified" size={14} color="#F0B90B" />
                            </View>
                        )}
                    </View>
                    <View style={styles.profileInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.username}>@{displayName}</Text>
                            <View style={[
                                styles.tierBadge,
                                profile?.subscription_tier === 'pro' && styles.tierBadgePro
                            ]}>
                                <Text style={[
                                    styles.tierText,
                                    profile?.subscription_tier === 'pro' && styles.tierTextPro
                                ]}>
                                    {(profile?.subscription_tier ?? 'free').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.memberSince}>Member since {memberSince}</Text>
                    </View>
                </View>

                {/* Stats grid */}
                <View style={styles.statsGrid}>
                    <StatCard label="Trades" value={myTrades.length} />
                    <StatCard label="Followers" value={followerCount} />
                    <StatCard label="Following" value={followingCount} />
                    <StatCard
                        label="Total P&L"
                        value={`${totalPL >= 0 ? '+' : ''}$${Math.abs(totalPL).toFixed(0)}`}
                        color={totalPL >= 0 ? '#0ECB81' : '#F6465D'}
                    />
                    <StatCard label="Win Rate" value={`${winRate}%`} color="#F0B90B" />
                </View>

                {/* My Trades */}
                {myTrades.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>My Trades</Text>
                        <FlatList
                            horizontal
                            data={myTrades}
                            keyExtractor={(item) => item.id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 10, paddingRight: 20 }}
                            renderItem={({ item }) => {
                                const isProfitable = (item.money_value || 0) >= 0;
                                return (
                                    <TouchableOpacity
                                        style={styles.tradeCard}
                                        onPress={() => { setSelectedTrade(item); setModalVisible(true); }}
                                        activeOpacity={0.85}
                                    >
                                        <View style={[styles.tradeTypeBadge, {
                                            backgroundColor: isProfitable
                                                ? 'rgba(14,203,129,0.12)'
                                                : 'rgba(246,70,93,0.12)'
                                        }]}>
                                            <Text style={[styles.tradeTypeBadgeText, {
                                                color: isProfitable ? '#0ECB81' : '#F6465D'
                                            }]}>
                                                {item.trade_type}
                                            </Text>
                                        </View>
                                        <Text style={styles.tradePair}>{item.symbol || 'UNKNOWN'}</Text>
                                        <Text style={[styles.tradeProfit, {
                                            color: isProfitable ? '#0ECB81' : '#F6465D'
                                        }]}>
                                            {isProfitable ? '+' : ''}${Math.abs(item.money_value || 0).toFixed(2)}
                                        </Text>
                                        <View style={styles.tradeLikes}>
                                            <FontAwesome name="heart" size={10} color="#F6465D" />
                                            <Text style={styles.tradeLikeCount}>{item.likes_count}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    </View>
                )}

                {/* Following */}
                {followed.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Following</Text>
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
                                    <Avatar url={item.avatar_url} username={item.username} size={48} />
                                    <Text style={styles.followedName} numberOfLines={1}>
                                        @{item.username}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                <View style={{ height: 100 }} />
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
    root: { flex: 1, backgroundColor: '#0B0E11' },
    scroll: { flex: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0E11' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#EAECEF' },
    signOutBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#1E2026',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#2B2F36',
    },
    dividerLine: { height: 1, backgroundColor: '#2B2F36' },

    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 20,
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#2B2F36',
    },
    avatarSection: { position: 'relative' },
    verifiedBadge: {
        position: 'absolute', bottom: 0, right: -2,
        backgroundColor: '#1E2026', borderRadius: 10, padding: 2,
        borderWidth: 1, borderColor: '#2B2F36',
    },
    profileInfo: { flex: 1, gap: 6 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    username: { fontSize: 18, fontWeight: '800', color: '#EAECEF' },
    tierBadge: {
        backgroundColor: '#1E2026',
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1, borderColor: '#2B2F36',
    },
    tierBadgePro: { backgroundColor: 'rgba(240,185,11,0.15)', borderColor: '#F0B90B' },
    tierText: { fontSize: 9, fontWeight: '800', color: '#848E9C' },
    tierTextPro: { color: '#F0B90B' },
    memberSince: { fontSize: 12, color: '#474D57', fontWeight: '500' },

    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#2B2F36',
    },
    statCard: {
        backgroundColor: '#1E2026',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        gap: 4,
        flex: 1,
        minWidth: '28%',
        borderWidth: 1,
        borderColor: '#2B2F36',
    },
    statNum: { fontSize: 16, fontWeight: '900', color: '#EAECEF' },
    statLabel: { fontSize: 10, fontWeight: '700', color: '#848E9C', textTransform: 'uppercase', letterSpacing: 0.5 },

    section: { paddingTop: 24, paddingLeft: 20 },
    sectionTitle: {
        fontSize: 13, fontWeight: '800', color: '#848E9C',
        textTransform: 'uppercase', letterSpacing: 1.2,
        marginBottom: 14,
    },
    tradeCard: {
        backgroundColor: '#1E2026',
        borderRadius: 8,
        padding: 14,
        width: 130,
        gap: 8,
        borderWidth: 1,
        borderColor: '#2B2F36',
    },
    tradeTypeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start' },
    tradeTypeBadgeText: { fontSize: 9, fontWeight: '800' },
    tradePair: { fontSize: 15, fontWeight: '800', color: '#EAECEF' },
    tradeProfit: { fontSize: 17, fontWeight: '900' },
    tradeLikes: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    tradeLikeCount: { fontSize: 11, fontWeight: '700', color: '#848E9C' },

    followedUser: { alignItems: 'center', gap: 8, width: 72 },
    followedName: {
        fontSize: 10, fontWeight: '700', color: '#848E9C',
        width: '100%', textAlign: 'center',
    },
});