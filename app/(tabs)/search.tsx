import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '../../components/Avatar';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Linking,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getForexNews, NewsItem as AVNewsItem } from '@/lib/news';
import { Trade } from '@/components/ForecastCard';
import UserPreviewCard from '../../components/userPreviewCard';

const { height: SH } = Dimensions.get('window');
const SHEET_H = SH * 0.82;

// ─── Types ───────────────────────────────────────────────────────────────────
type UserProfile = {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    subscription_tier: string;
    follower_count?: number;
    following_count?: number;
};

type UserDetail = UserProfile & {
    member_since?: string;
    followerCount: number;
    followingCount: number;
    tradeCount: number;
    recentTrades: Trade[];
    totalPL: number;
};

// ─── User Profile Preview Sheet ──────────────────────────────────────────────
function ProfilePreviewSheet({
    userId,
    visible,
    onClose,
    currentUserId,
}: {
    userId: string | null;
    visible: boolean;
    onClose: () => void;
    currentUserId?: string;
}) {
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const [detail, setDetail] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, { dy }) => dy > 10,
            onPanResponderMove: (_, { dy }) => { if (dy > 0) slideAnim.setValue(dy); },
            onPanResponderRelease: (_, { dy, vy }) => {
                if (dy > 120 || vy > 1.2) onClose();
                else Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }).start();
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
            if (userId) loadProfile(userId);
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: SHEET_H, duration: 260, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, userId]);

    const loadProfile = async (uid: string) => {
        setLoading(true);
        setDetail(null);

        const [userRes, tradesRes, followerRes, followingRes, followStatusRes] = await Promise.all([
            supabase.from('users').select('*').eq('id', uid).maybeSingle(),
            supabase.from('trades').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', uid),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
            currentUserId
                ? supabase.from('follows').select('*').eq('follower_id', currentUserId).eq('followed_id', uid).maybeSingle()
                : Promise.resolve({ data: null }),
        ]);

        const trades = (tradesRes.data || []) as Trade[];
        const totalPL = trades.reduce((sum, t) => sum + (t.money_value || 0), 0);

        setIsFollowing(!!(followStatusRes as any).data);
        setDetail({
            ...(userRes.data as UserProfile),
            member_since: userRes.data?.member_since,
            followerCount: (followerRes as any).count ?? 0,
            followingCount: (followingRes as any).count ?? 0,
            tradeCount: (tradesRes.data || []).length,
            recentTrades: trades,
            totalPL,
        });
        setLoading(false);
    };

    const handleFollowToggle = async () => {
        if (!currentUserId || !userId) return;
        setFollowLoading(true);
        if (isFollowing) {
            await supabase.from('follows').delete()
                .eq('follower_id', currentUserId).eq('followed_id', userId);
            setIsFollowing(false);
            setDetail(prev => prev ? { ...prev, followerCount: prev.followerCount - 1 } : prev);
        } else {
            await supabase.from('follows').insert({ follower_id: currentUserId, followed_id: userId });
            setIsFollowing(true);
            setDetail(prev => prev ? { ...prev, followerCount: prev.followerCount + 1 } : prev);
        }
        setFollowLoading(false);
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[ps.backdrop, { opacity: backdropAnim }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
            </Animated.View>

            <Animated.View style={[ps.sheet, { transform: [{ translateY: slideAnim }] }]}>
                <View {...panResponder.panHandlers} style={ps.handleArea}>
                    <View style={ps.handle} />
                </View>

                {loading || !detail ? (
                    <View style={ps.loader}>
                        <ActivityIndicator size="large" color="#F5C400" />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={ps.content} showsVerticalScrollIndicator={false}>
                        {/* Profile header */}
                        <View style={ps.profileHeader}>
                            <Avatar url={detail.avatar_url} username={detail.username} size={72} />
                            <View style={ps.profileInfo}>
                                <View style={ps.nameRow}>
                                    <Text style={ps.username}>@{detail.username}</Text>
                                    {detail.is_verified && (
                                        <MaterialIcons name="verified" size={16} color="#F5C400" />
                                    )}
                                    <View style={[ps.tierBadge, detail.subscription_tier === 'pro' && ps.tierPro]}>
                                        <Text style={[ps.tierText, detail.subscription_tier === 'pro' && ps.tierProText]}>
                                            {(detail.subscription_tier || 'FREE').toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                                {detail.member_since && (
                                    <Text style={ps.memberSince}>
                                        Joined {new Date(detail.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </Text>
                                )}
                            </View>
                        </View>

                        {/* Stats row */}
                        <View style={ps.statsRow}>
                            <View style={ps.stat}>
                                <Text style={ps.statNum}>{detail.followerCount}</Text>
                                <Text style={ps.statLabel}>Followers</Text>
                            </View>
                            <View style={ps.statDivider} />
                            <View style={ps.stat}>
                                <Text style={ps.statNum}>{detail.followingCount}</Text>
                                <Text style={ps.statLabel}>Following</Text>
                            </View>
                            <View style={ps.statDivider} />
                            <View style={ps.stat}>
                                <Text style={ps.statNum}>{detail.tradeCount}</Text>
                                <Text style={ps.statLabel}>Trades</Text>
                            </View>
                            <View style={ps.statDivider} />
                            <View style={ps.stat}>
                                <Text style={[ps.statNum, { color: detail.totalPL >= 0 ? '#059669' : '#dc2626' }]}>
                                    {detail.totalPL >= 0 ? '+' : '-'}${Math.abs(detail.totalPL).toFixed(0)}
                                </Text>
                                <Text style={ps.statLabel}>Total P&L</Text>
                            </View>
                        </View>

                        {/* Action buttons */}
                        <View style={ps.actionRow}>
                            {currentUserId !== userId && (
                                <TouchableOpacity
                                    style={[ps.followBtn, isFollowing && ps.followBtnActive]}
                                    onPress={handleFollowToggle}
                                    disabled={followLoading}
                                >
                                    {followLoading
                                        ? <ActivityIndicator size="small" color={isFollowing ? '#888' : '#1a1a1a'} />
                                        : <Text style={[ps.followBtnText, isFollowing && ps.followBtnTextActive]}>
                                            {isFollowing ? '✓ Following' : 'Follow'}
                                        </Text>
                                    }
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={ps.viewProfileBtn}
                                onPress={() => {
                                    onClose();
                                    setTimeout(() => router.push(`/user-profile?userId=${userId}`), 300);
                                }}
                            >
                                <Text style={ps.viewProfileText}>Full profile →</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Recent trades */}
                        {detail.recentTrades.length > 0 && (
                            <View style={ps.tradesSection}>
                                <Text style={ps.sectionTitle}>Recent trades</Text>
                                {detail.recentTrades.map(trade => (
                                    <View key={trade.id} style={ps.tradeRow}>
                                        <View style={[ps.tradeTypeDot, { backgroundColor: trade.trade_type === 'Buy' ? '#3182CE' : '#E53E3E' }]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={ps.tradeSymbol}>{trade.symbol}</Text>
                                            <Text style={ps.tradeDate}>
                                                {new Date(trade.trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </Text>
                                        </View>
                                        <Text style={[ps.tradePL, { color: (trade.money_value || 0) >= 0 ? '#059669' : '#dc2626' }]}>
                                            {(trade.money_value || 0) >= 0 ? '+' : '-'}${Math.abs(trade.money_value || 0).toFixed(2)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                )}
            </Animated.View>
        </Modal>
    );
}

// ─── Time ago ────────────────────────────────────────────────────────────────
function timeAgo(ts: number) {
    const diff = Math.floor(Date.now() / 1000 - ts);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function Search() {
    const router = useRouter();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<UserProfile[]>([]);
    const [news, setNews] = useState<AVNewsItem[]>([]);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [loadingNews, setLoadingNews] = useState(true);

    // Profile preview sheet
    const [previewUserId, setPreviewUserId] = useState<string | null>(null);
    const [sheetVisible, setSheetVisible] = useState(false);

    const fetchFollowing = useCallback(async () => {
        if (!user?.id) return;
        const { data } = await supabase.from('follows').select('followed_id').eq('follower_id', user.id);
        if (data) setFollowingIds(new Set(data.map(f => f.followed_id)));
    }, [user?.id]);

    const fetchNews = useCallback(async () => {
        setLoadingNews(true);
        try { setNews(await getForexNews()); } catch { }
        finally { setLoadingNews(false); }
    }, []);
    const fetchAllUsers = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('users')
            .select('id, username, avatar_url, is_verified, subscription_tier')
            .neq('id', user?.id ?? '')
            .order('username', { ascending: true })
            .limit(50);
        setLoading(false);
        if (data) setResults(data as UserProfile[]);
    }, [user?.id]);


    useEffect(() => { fetchFollowing(); fetchNews(); fetchAllUsers(); }, [fetchFollowing, fetchNews, fetchAllUsers]);


    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 1) { fetchAllUsers(); return; }
        setLoading(true);
        const { data } = await supabase
            .from('users')
            .select('id, username, avatar_url, is_verified, subscription_tier')
            .ilike('username', `%${query.trim()}%`)
            .neq('id', user?.id ?? '')
            .limit(12);
        setLoading(false);
        if (data) setResults(data as UserProfile[]);
    };

    const toggleFollow = async (targetId: string) => {
        if (!user?.id) return;
        const following = followingIds.has(targetId);
        setFollowingIds(prev => {
            const next = new Set(prev);
            if (following) next.delete(targetId); else next.add(targetId);
            return next;
        });
        if (following) {
            await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', targetId);
        } else {
            await supabase.from('follows').insert({ follower_id: user.id, followed_id: targetId });
        }
    };

    const openPreview = (uid: string) => {
        setPreviewUserId(uid);
        setSheetVisible(true);
    };

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <View style={s.header}>
                <Text style={s.headerTitle}>Explore</Text>
            </View>

            {/* Search bar */}
            <View style={s.searchBar}>
                <FontAwesome name="search" size={15} color="#aaa" />
                <TextInput
                    style={s.searchInput}
                    placeholder="Search traders…"
                    placeholderTextColor="#bbb"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {loading
                    ? <ActivityIndicator size="small" color="#F5C400" />
                    : searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); fetchAllUsers(); }}>
                            <FontAwesome name="times-circle" size={16} color="#ccc" />
                        </TouchableOpacity>
                    )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Results */}
                {results.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Traders</Text>
                        {results.map(item => (
                            <TouchableOpacity
                                key={item.id}
                                style={s.userCard}
                                onPress={() => openPreview(item.id)}
                                activeOpacity={0.85}
                            >
                                <Avatar url={item.avatar_url} username={item.username} size={46} />
                                <View style={s.userInfo}>
                                    <View style={s.userNameRow}>
                                        <Text style={s.username}>@{item.username}</Text>
                                        {item.is_verified && (
                                            <MaterialIcons name="verified" size={13} color="#F5C400" />
                                        )}
                                    </View>
                                    <Text style={s.userTier}>{item.subscription_tier} member</Text>
                                </View>
                                <View style={s.userRight}>
                                    <TouchableOpacity
                                        style={[s.followBtn, followingIds.has(item.id) && s.followingBtn]}
                                        onPress={() => toggleFollow(item.id)}
                                    >
                                        <Text style={[s.followBtnText, followingIds.has(item.id) && s.followingBtnText]}>
                                            {followingIds.has(item.id) ? 'Following' : 'Follow'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => openPreview(item.id)} style={s.previewHint}>
                                        <Text style={s.previewHintText}>Preview</Text>
                                        <FontAwesome name="chevron-right" size={10} color="#bbb" />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* No results state */}
                {searchQuery.length > 0 && results.length === 0 && !loading && (
                    <View style={s.noResults}>
                        <Text style={s.noResultsIcon}>🔍</Text>
                        <Text style={s.noResultsText}>No traders found for "{searchQuery}"</Text>
                    </View>
                )}

                {/* News section */}
                <View style={s.section}>
                    <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>Market News</Text>
                        {loadingNews && <ActivityIndicator size="small" color="#F5C400" />}
                    </View>

                    {news.map(item => (
                        <TouchableOpacity
                            key={item.id}
                            style={s.newsCard}
                            onPress={() => Linking.openURL(item.url).catch(() => { })}
                            activeOpacity={0.8}
                        >
                            <View style={s.newsContent}>
                                <View style={s.newsTop}>
                                    <View style={[s.sentimentDot, {
                                        backgroundColor: item.sentiment === 'bullish' ? '#059669'
                                            : item.sentiment === 'bearish' ? '#dc2626' : '#999'
                                    }]} />
                                    <Text style={s.newsSource}>{item.source}</Text>
                                    <Text style={s.newsDate}>{timeAgo(item.datetime)}</Text>
                                </View>
                                <Text style={s.newsTitle} numberOfLines={2}>{item.headline}</Text>
                                <Text style={s.newsSummary} numberOfLines={2}>{item.summary}</Text>
                                {item.tickers.length > 0 && (
                                    <View style={s.tickerRow}>
                                        {item.tickers.map(t => (
                                            <View key={t} style={s.tickerBadge}>
                                                <Text style={s.tickerText}>{t}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                            {item.image && (
                                <Image source={{ uri: item.image }} style={s.newsImg} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Profile Preview Sheet */}
            <ProfilePreviewSheet
                userId={previewUserId}
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                currentUserId={user?.id}
            />
        </SafeAreaView>
    );
}

// ─── Profile Sheet Styles ────────────────────────────────────────────────────
const ps = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SHEET_H,
        backgroundColor: '#FAFAF8',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    handleArea: { paddingVertical: 14, alignItems: 'center' },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20, gap: 20, paddingBottom: 60 },

    profileHeader: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    profileInfo: { flex: 1, gap: 6 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    username: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
    tierBadge: { backgroundColor: '#f0f0ee', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    tierPro: { backgroundColor: '#F5C400' },
    tierText: { fontSize: 9, fontWeight: '800', color: '#888' },
    tierProText: { color: '#1a1a1a' },
    memberSince: { fontSize: 12, color: '#aaa', fontWeight: '500' },

    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statNum: { fontSize: 17, fontWeight: '900', color: '#1a1a1a' },
    statLabel: { fontSize: 11, color: '#aaa', fontWeight: '600' },
    statDivider: { width: 1, height: 28, backgroundColor: '#f0f0f0' },

    actionRow: { flexDirection: 'row', gap: 10 },
    followBtn: {
        flex: 1,
        height: 46,
        borderRadius: 14,
        backgroundColor: '#F5C400',
        justifyContent: 'center',
        alignItems: 'center',
    },
    followBtnActive: { backgroundColor: '#f0f0ee' },
    followBtnText: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
    followBtnTextActive: { color: '#888' },
    viewProfileBtn: {
        height: 46,
        paddingHorizontal: 18,
        borderRadius: 14,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewProfileText: { fontSize: 13, fontWeight: '700', color: '#F5C400' },

    tradesSection: { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
    tradeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tradeTypeDot: { width: 8, height: 8, borderRadius: 4 },
    tradeSymbol: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
    tradeDate: { fontSize: 11, color: '#aaa', fontWeight: '500' },
    tradePL: { fontSize: 14, fontWeight: '900' },
});

// ─── Main Styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },

    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 14,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 4,
    },
    searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a' },

    section: { marginTop: 20, paddingHorizontal: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },

    // User card
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 18,
        marginBottom: 10,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    userInfo: { flex: 1 },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    username: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
    userTier: { fontSize: 11, color: '#aaa', fontWeight: '600', textTransform: 'capitalize' },
    userRight: { alignItems: 'flex-end', gap: 4 },
    followBtn: { backgroundColor: '#F5C400', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
    followingBtn: { backgroundColor: '#eee' },
    followBtnText: { fontSize: 12, fontWeight: '700', color: '#1a1a1a' },
    followingBtnText: { color: '#888' },
    previewHint: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    previewHintText: { fontSize: 10, color: '#bbb', fontWeight: '600' },

    // No results
    noResults: { alignItems: 'center', paddingTop: 48, gap: 10 },
    noResultsIcon: { fontSize: 40 },
    noResultsText: { fontSize: 14, color: '#aaa', fontWeight: '600' },

    // News
    newsCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 18,
        marginBottom: 12,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    newsContent: { flex: 1, gap: 5 },
    newsTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sentimentDot: { width: 6, height: 6, borderRadius: 3 },
    newsSource: { fontSize: 10, fontWeight: '800', color: '#F5C400', textTransform: 'uppercase', flex: 1 },
    newsDate: { fontSize: 10, color: '#bbb', fontWeight: '600' },
    newsTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', lineHeight: 19 },
    newsSummary: { fontSize: 12, color: '#777', lineHeight: 17, marginTop: 2 },
    newsImg: { width: 76, height: 76, borderRadius: 12, backgroundColor: '#f5f5f5', alignSelf: 'center' },
    tickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
    tickerBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    tickerText: { fontSize: 9, fontWeight: '700', color: '#666' },
});