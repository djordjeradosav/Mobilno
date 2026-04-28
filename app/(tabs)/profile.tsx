import { Forecast } from '@/components/ForecastCard';
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

export default function Profile() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [myForecasts, setMyForecasts] = useState<Forecast[]>([]);
    const [followed, setFollowed] = useState<FollowedUser[]>([]);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedForecast, setSelectedForecast] = useState<Forecast | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

    const fetchProfile = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('users').select('*').eq('id', user.id).maybeSingle();
        if (error) console.error('[fetchProfile]', error.message);
        if (data) setProfile(data as ProfileData);
    }, [user?.id]);

    const fetchMyForecasts = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('forecasts')
            .select('*, users!forecasts_user_id_fkey(username, avatar_url, is_verified)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (error) console.error('[fetchMyForecasts]', error.message);
        if (data) setMyForecasts(data as Forecast[]);
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
            .select('forecast_id')
            .eq('user_id', user.id);
        if (data) setLikedIds(new Set(data.map(l => l.forecast_id)));
    }, [user?.id]);

    const init = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchProfile(), fetchMyForecasts(), fetchFollowed(), fetchLikes()]);
        setLoading(false);
    }, [fetchProfile, fetchMyForecasts, fetchFollowed, fetchLikes]);

    useEffect(() => { init(); }, [init]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchProfile(), fetchMyForecasts(), fetchFollowed(), fetchLikes()]);
        setRefreshing(false);
    }, [fetchProfile, fetchMyForecasts, fetchFollowed, fetchLikes]);

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
        fetchMyForecasts();
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
                            <Text style={styles.statNum}>{myForecasts.length}</Text>
                            <Text style={styles.statLabel}>Forecasts</Text>
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

                {myForecasts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📈 My Forecasts</Text>
                        <FlatList
                            horizontal
                            data={myForecasts}
                            keyExtractor={(item) => item.id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 12 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.tradeCard}
                                    onPress={() => { setSelectedForecast(item); setModalVisible(true); }}
                                    activeOpacity={0.9}
                                >
                                    <Text style={styles.tradePair}>{item.currency_pair}</Text>
                                    <Text style={[styles.tradeProfit, { color: item.profit >= 0 ? '#059669' : '#dc2626' }]}>
                                        {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(1)}%
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
                            contentContainerStyle={{ gap: 16 }}
                            renderItem={({ item }) => (
                                <View style={styles.followedUser}>
                                    <Avatar url={item.avatar_url} username={item.username} size={50} />
                                    <Text style={styles.followedName} numberOfLines={1}>@{item.username}</Text>
                                </View>
                            )}
                        />
                    </View>
                )}
            </ScrollView>

            <TradeDetailsModal
                visible={modalVisible}
                forecast={selectedForecast}
                onClose={() => setModalVisible(false)}
                onLike={handleLike}
                isLiked={selectedForecast ? likedIds.has(selectedForecast.id) : false}
                currentUserId={user?.id}
                onUpdate={fetchMyForecasts}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    loader: { flex: 1, backgroundColor: '#F5F5F3', alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
    settingsBtn: { padding: 8 },
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
    statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 20 },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statNum: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
    statLabel: { fontSize: 12, color: '#aaa', fontWeight: '600' },
    statDivider: { width: 1, height: 24, backgroundColor: '#f5f5f5' },
    section: { marginTop: 32, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },
    tradeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: 140, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    tradePair: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
    tradeProfit: { fontSize: 16, fontWeight: '900' },
    tradeLikes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tradeLikeCount: { fontSize: 12, color: '#666', fontWeight: '600' },
    followedUser: { alignItems: 'center', gap: 8, width: 70 },
    followedName: { fontSize: 11, fontWeight: '700', color: '#666', textAlign: 'center' },
});