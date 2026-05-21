import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import Avatar from '../../components/Avatar';
import {
    ActivityIndicator,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getForexNews, NewsItem as AVNewsItem } from '@/lib/news';
import ProfilePreviewSheet from '@/components/ProfilePreviewSheet';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import { Trade } from '@/components/ForecastCard';

type UserProfile = {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    subscription_tier: string;
};

function timeAgo(ts: number) {
    const diff = Math.floor(Date.now() / 1000 - ts);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function Search() {
    const router = useRouter();
    const { user } = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<UserProfile[]>([]);
    const [news, setNews] = useState<AVNewsItem[]>([]);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [loadingNews, setLoadingNews] = useState(true);
    const [previewUserId, setPreviewUserId] = useState<string | null>(null);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [tradeResults, setTradeResults] = useState<Trade[]>([]);
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
    const [tradeModalVisible, setTradeModalVisible] = useState(false);

    const fetchFollowing = useCallback(async () => {
        if (!user?.id) return;
        const { data } = await supabase.from('follows').select('followed_id').eq('follower_id', user.id);
        if (data) setFollowingIds(new Set(data.map((f: { followed_id: string }) => f.followed_id)));
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
            .order('username', { ascending: true })
            .limit(50);
        setLoading(false);
        if (data) setResults(data as UserProfile[]);
    }, []);

    useEffect(() => {
        fetchFollowing();
        fetchNews();
        fetchAllUsers();
    }, [fetchFollowing, fetchNews, fetchAllUsers]);

    const isTicker = (q: string) =>
        /^[A-Z0-9]{2,6}$/.test(q.trim()) || q.trim().includes('/');

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 1) { fetchAllUsers(); setTradeResults([]); return; }
        setLoading(true);
        const [usersRes, tradesRes] = await Promise.all([
            supabase
                .from('users')
                .select('id, username, avatar_url, is_verified, subscription_tier')
                .or(`username.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`)
                .limit(12),
            isTicker(query)
                ? supabase
                    .from('trades')
                    .select('*, users!trades_user_id_fkey(username, avatar_url, is_verified)')
                    .ilike('symbol', `%${query.trim()}%`)
                    .order('likes_count', { ascending: false })
                    .limit(10)
                : Promise.resolve({ data: [] }),
        ]);
        setLoading(false);
        if (usersRes.data) setResults(usersRes.data as UserProfile[]);
        if (tradesRes.data) setTradeResults(tradesRes.data as Trade[]);
    };

    const toggleFollow = async (targetId: string) => {
        if (!user?.id || user.id === targetId) return;
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
        <SafeAreaView style={[s.root, { backgroundColor: Colors[colorScheme].background }]} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <Text style={[s.headerTitle, { color: Colors[colorScheme].text }]}>Explore</Text>
                {loadingNews && <ActivityIndicator size="small" color="#F0B90B" />}
            </View>

            <View style={[s.dividerLine, { backgroundColor: isDark ? '#2B2F36' : '#E0E0E0' }]} />

            {/* Search bar */}
            <View style={[s.searchBar, { backgroundColor: isDark ? '#1E2026' : '#F9F9F9', borderColor: isDark ? '#2B2F36' : '#E0E0E0' }]}>
                <FontAwesome name="search" size={14} color="#848E9C" />
                <TextInput
                    style={[s.searchInput, { color: Colors[colorScheme].text }]}
                    placeholder="Search traders…"
                    placeholderTextColor={isDark ? "#474D57" : "#999"}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {loading
                    ? <ActivityIndicator size="small" color="#F0B90B" />
                    : searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); fetchAllUsers(); }}>
                            <FontAwesome name="times-circle" size={14} color="#848E9C" />
                        </TouchableOpacity>
                    )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

                {/* Traders */}
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
                                <Avatar url={item.avatar_url} username={item.username} size={42} />
                                <View style={s.userInfo}>
                                    <View style={s.userNameRow}>
                                        <Text style={[s.username, { color: Colors[colorScheme].text }]}>@{item.username}</Text>
                                        {item.is_verified && (
                                            <MaterialIcons name="verified" size={12} color="#F0B90B" />
                                        )}
                                    </View>
                                    <Text style={s.userTier}>{item.subscription_tier} member</Text>
                                </View>
                                {user?.id !== item.id && (
                                    <TouchableOpacity
                                        style={[s.followBtn, followingIds.has(item.id) && s.followingBtn]}
                                        onPress={() => toggleFollow(item.id)}
                                    >
                                        <Text style={[s.followBtnText, followingIds.has(item.id) && s.followingBtnText]}>
                                            {followingIds.has(item.id) ? 'Following' : 'Follow'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* No results */}
                {searchQuery.length > 0 && results.length === 0 && tradeResults.length === 0 && !loading && (
                    <View style={s.noResults}>
                        <Text style={s.noResultsIcon}>🔍</Text>
                        <Text style={s.noResultsText}>No results found for "{searchQuery}"</Text>
                    </View>
                )}

                {/* Trade results */}
                {tradeResults.length > 0 && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Trades for {searchQuery.trim().toUpperCase()}</Text>
                        {tradeResults.map(trade => (
                            <TouchableOpacity
                                key={trade.id}
                                style={s.tradeCard}
                                onPress={() => { setSelectedTrade(trade); setTradeModalVisible(true); }}
                                activeOpacity={0.85}
                            >
                                <View style={s.tradeBadge}>
                                    <Text style={s.tradeBadgeText}>{trade.symbol}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.tradeType, { color: Colors[colorScheme].text }]}>{trade.trade_type ?? 'Trade'}</Text>
                                    <Text style={s.tradeUser}>@{(trade as any).users?.username ?? ''}</Text>
                                </View>
                                <Text style={[
                                    s.tradePL,
                                    { color: (trade.money_value ?? 0) >= 0 ? '#0ECB81' : '#F6465D' }
                                ]}>
                                    {(trade.money_value ?? 0) >= 0 ? '+' : ''}{(trade.money_value ?? 0).toFixed(2)}$
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* News */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Market News</Text>
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
                                        backgroundColor: item.sentiment === 'bullish' ? '#0ECB81'
                                            : item.sentiment === 'bearish' ? '#F6465D' : '#848E9C'
                                    }]} />
                                    <Text style={s.newsSource}>{item.source}</Text>
                                    <Text style={s.newsDate}>{timeAgo(item.datetime)}</Text>
                                </View>
                                <Text style={[s.newsTitle, { color: Colors[colorScheme].text }]} numberOfLines={2}>{item.headline}</Text>
                                <Text style={[s.newsSummary, { color: isDark ? '#848E9C' : '#666' }]} numberOfLines={2}>{item.summary}</Text>
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

            <ProfilePreviewSheet
                userId={previewUserId}
                visible={sheetVisible}
                onClose={() => setSheetVisible(false)}
                currentUserId={user?.id}
            />

            <TradeDetailsModal
                visible={tradeModalVisible}
                forecast={selectedTrade}
                onClose={() => setTradeModalVisible(false)}
                onLike={() => { }}
                isLiked={false}
                currentUserId={user?.id}
            />
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0B0E11' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#EAECEF' },
    dividerLine: { height: 1, backgroundColor: '#2B2F36' },

    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E2026',
        margin: 16,
        paddingHorizontal: 14,
        height: 48,
        borderRadius: 8,
        gap: 10,
        borderWidth: 1,
        borderColor: '#2B2F36',
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '500', color: '#EAECEF' },

    section: { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle: {
        fontSize: 11, fontWeight: '800', color: '#848E9C',
        textTransform: 'uppercase', letterSpacing: 1.2,
        marginBottom: 12,
    },

    // User card
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#161A1E',
        padding: 14,
        borderRadius: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#2B2F36',
        gap: 12,
    },
    userInfo: { flex: 1 },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    username: { fontSize: 14, fontWeight: '700', color: '#EAECEF' },
    userTier: { fontSize: 11, color: '#848E9C', fontWeight: '600', textTransform: 'capitalize' },
    followBtn: {
        backgroundColor: 'rgba(240,185,11,0.15)',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#F0B90B',
    },
    followingBtn: { backgroundColor: '#1E2026', borderColor: '#2B2F36' },
    followBtnText: { fontSize: 12, fontWeight: '700', color: '#F0B90B' },
    followingBtnText: { color: '#848E9C' },

    // No results
    noResults: { alignItems: 'center', paddingTop: 48, gap: 10 },
    noResultsIcon: { fontSize: 40 },
    noResultsText: { fontSize: 14, color: '#848E9C', fontWeight: '600' },

    // News
    newsCard: {
        flexDirection: 'row',
        backgroundColor: '#161A1E',
        padding: 14,
        borderRadius: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#2B2F36',
        gap: 12,
    },
    newsContent: { flex: 1, gap: 6 },
    newsTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sentimentDot: { width: 6, height: 6, borderRadius: 3 },
    newsSource: {
        fontSize: 10, fontWeight: '800', color: '#F0B90B',
        textTransform: 'uppercase', flex: 1,
    },
    newsDate: { fontSize: 10, color: '#474D57', fontWeight: '600' },
    newsTitle: { fontSize: 13, fontWeight: '700', color: '#EAECEF', lineHeight: 19 },
    newsSummary: { fontSize: 12, color: '#848E9C', lineHeight: 17 },
    newsImg: { width: 72, height: 72, borderRadius: 6, backgroundColor: '#1E2026', alignSelf: 'center' },
    tickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
    tickerBadge: { backgroundColor: '#1E2026', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#2B2F36' },
    tickerText: { fontSize: 9, fontWeight: '700', color: '#848E9C' },

    // Trade card
    tradeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#161A1E',
        padding: 14,
        borderRadius: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#2B2F36',
        gap: 12,
    },
    tradeBadge: {
        backgroundColor: '#1E2026',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#F0B90B',
    },
    tradeBadgeText: { fontSize: 12, fontWeight: '800', color: '#F0B90B' },
    tradeType: { fontSize: 13, fontWeight: '700', color: '#EAECEF' },
    tradeUser: { fontSize: 11, color: '#848E9C', fontWeight: '500', marginTop: 2 },
    tradePL: { fontSize: 14, fontWeight: '900' },
});