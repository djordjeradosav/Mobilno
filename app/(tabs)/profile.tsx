import { Forecast } from '@/components/ForecastCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import { supabase } from '@/lib/supabase';
import { useAuth, useUser } from '@clerk/clerk-expo';
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
    const { user } = useUser();
    const { signOut } = useAuth();
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

    const fetchProfile = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('users').select('*').eq('id', user.id).single();
        if (error) console.error('[fetchProfile]', error.message);
        if (data) setProfile(data as ProfileData);
    }, [user?.id]);

    const fetchMyForecasts = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('forecasts')
            .select('*, users(username, avatar_url, is_verified)')
            .eq('user_id', user.id)
            .order('profit', { ascending: false })
            .limit(10);
        if (error) console.error('[fetchMyForecasts]', error.message);
        if (data) setMyForecasts(data as Forecast[]);
    }, [user?.id]);

    const fetchFollowed = useCallback(async () => {
        if (!user?.id) return;
        const { data: followingData, count: fwingCount } = await supabase
            .from('follows')
            .select('following_id', { count: 'exact' })
            .eq('follower_id', user.id);

        const { count: fwerCount } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', user.id);

        setFollowingCount(fwingCount ?? 0);
        setFollowerCount(fwerCount ?? 0);

        if (followingData && followingData.length > 0) {
            const ids = followingData.map((f: { following_id: string }) => f.following_id);
            const { data: usersData, error } = await supabase
                .from('users')
                .select('id, username, avatar_url, is_verified')
                .in('id', ids)
                .limit(10);
            if (error) console.error('[fetchFollowed:users]', error.message);
            if (usersData) setFollowed(usersData as FollowedUser[]);
        }
    }, [user?.id]);

    const init = useCallback(async () => {
        setLoading(true);
        await Promise.all([fetchProfile(), fetchMyForecasts(), fetchFollowed()]);
        setLoading(false);
    }, [fetchProfile, fetchMyForecasts, fetchFollowed]);

    useEffect(() => { init(); }, [init]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchProfile(), fetchMyForecasts(), fetchFollowed()]);
        setRefreshing(false);
    }, [fetchProfile, fetchMyForecasts, fetchFollowed]);

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await signOut();
                    // FIX: use replace so the user can't swipe back to the protected tab
                    router.replace('/(auth)/welcome');
                },
            },
        ]);
    };

    const handleDeleteForecast = async (id: string) => {
        Alert.alert('Delete Forecast', 'This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const { error } = await supabase
                        .from('forecasts')
                        .delete()
                        .eq('id', id)
                        .eq('user_id', user?.id ?? '');
                    if (error) {
                        Alert.alert('Error', 'Could not delete forecast. Please try again.');
                        return;
                    }
                    setMyForecasts((prev) => prev.filter((f) => f.id !== id));
                },
            },
        ]);
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#F5C400" />
            </View>
        );
    }

    const displayName = profile?.username ?? user?.username ?? 'trader';
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
                        <FontAwesome name="cog" size={20} color="#1a1a1a" />
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
                        <Text style={styles.sectionTitle}>🏆 Best Trades</Text>
                        <FlatList
                            horizontal
                            data={myForecasts.slice(0, 5)}
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
                            contentContainerStyle={{ gap: 12 }}
                            renderItem={({ item }) => (
                                <View style={styles.followedCard}>
                                    <Avatar url={item.avatar_url} username={item.username} size={48} />
                                    {item.is_verified && (
                                        <View style={styles.smallVerified}>
                                            <MaterialIcons name="verified" size={12} color="#F5C400" />
                                        </View>
                                    )}
                                    <Text style={styles.followedName} numberOfLines={1}>@{item.username}</Text>
                                </View>
                            )}
                        />
                    </View>
                )}

                <View style={styles.section}>
                    <View style={styles.sectionRow}>
                        <Text style={styles.sectionTitle}>📊 My Forecasts</Text>
                        <Text style={styles.sectionCount}>{myForecasts.length}</Text>
                    </View>
                    {myForecasts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="trending-up" size={40} color="#ddd" />
                            <Text style={styles.emptyText}>No forecasts yet</Text>
                        </View>
                    ) : (
                        myForecasts.map((item) => (
                            <View key={item.id} style={styles.myForecastRow}>
                                <TouchableOpacity
                                    style={styles.myForecastContent}
                                    onPress={() => { setSelectedForecast(item); setModalVisible(true); }}
                                    activeOpacity={0.85}
                                >
                                    <View style={[styles.profitBadge, { backgroundColor: item.profit >= 0 ? '#ecfdf5' : '#fef2f2' }]}>
                                        <Text style={[styles.profitText, { color: item.profit >= 0 ? '#059669' : '#dc2626' }]}>
                                            {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(1)}%
                                        </Text>
                                    </View>
                                    <View style={styles.myForecastInfo}>
                                        <Text style={styles.myForecastPair}>{item.currency_pair}</Text>
                                        <Text style={styles.myForecastDesc} numberOfLines={1}>
                                            {item.content || 'No description'}
                                        </Text>
                                    </View>
                                    <View style={styles.myForecastLikes}>
                                        <FontAwesome name="heart" size={12} color="#ef4444" />
                                        <Text style={styles.myForecastLikeCount}>{item.likes_count}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteForecast(item.id)}>
                                    <FontAwesome name="trash-o" size={16} color="#dc2626" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                    <FontAwesome name="sign-out" size={16} color="#dc2626" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>

            <TradeDetailsModal
                visible={modalVisible}
                forecast={selectedForecast}
                onClose={() => setModalVisible(false)}
                onLike={() => {}}
                isLiked={false}
                currentUserId={user?.id}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    loader: { flex: 1, backgroundColor: '#F5F5F3', alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
    settingsBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0f0ee', alignItems: 'center', justifyContent: 'center' },
    profileCard: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
    avatarWrap: { position: 'relative', alignSelf: 'flex-start' },
    verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1a1a1a', borderRadius: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
    profileInfo: { gap: 6 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    username: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
    tierBadge: { backgroundColor: '#f0f0ee', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    tierBadgePro: { backgroundColor: '#F5C400' },
    tierText: { fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 1 },
    tierTextPro: { color: '#1a1a1a' },
    memberSince: { fontSize: 13, color: '#aaa', fontWeight: '500' },
    statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0ee', paddingTop: 16 },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statNum: { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },
    statLabel: { fontSize: 12, color: '#aaa', fontWeight: '600' },
    statDivider: { width: 1, backgroundColor: '#f0f0ee' },
    section: { marginTop: 28, paddingHorizontal: 20, gap: 12 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
    sectionCount: { fontSize: 13, fontWeight: '700', color: '#aaa' },
    tradeCard: { width: 120, backgroundColor: '#1a1a1a', borderRadius: 16, padding: 14, gap: 6 },
    tradePair: { fontSize: 12, fontWeight: '800', color: '#fff' },
    tradeProfit: { fontSize: 18, fontWeight: '900' },
    tradeLikes: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    tradeLikeCount: { fontSize: 12, color: '#888', fontWeight: '600' },
    followedCard: { alignItems: 'center', gap: 6, position: 'relative' },
    smallVerified: { position: 'absolute', top: 0, right: -2, backgroundColor: '#1a1a1a', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
    followedName: { fontSize: 11, fontWeight: '700', color: '#1a1a1a', maxWidth: 70, textAlign: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { fontSize: 15, color: '#aaa', fontWeight: '600' },
    myForecastRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    myForecastContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    profitBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    profitText: { fontSize: 14, fontWeight: '800' },
    myForecastInfo: { flex: 1, gap: 3 },
    myForecastPair: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    myForecastDesc: { fontSize: 12, color: '#aaa', fontWeight: '500' },
    myForecastLikes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    myForecastLikeCount: { fontSize: 13, color: '#666', fontWeight: '600' },
    deleteBtn: { paddingHorizontal: 16, paddingVertical: 14, borderLeftWidth: 1, borderLeftColor: '#f0f0ee' },
    signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 20, marginTop: 32, marginBottom: 40, backgroundColor: '#fef2f2', borderRadius: 14, paddingVertical: 16, borderWidth: 1.5, borderColor: '#fecaca' },
    signOutText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
});
