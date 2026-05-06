import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import Avatar from '../../components/Avatar';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
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
import { getForexNews, NewsItem as AVNewsItem } from '@/lib/news';
import ProfilePreviewSheet from '@/components/ProfilePreviewSheet';

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
            .order('username', { ascending: true })
            .limit(50);
        setLoading(false);
        if (data) setResults(data as UserProfile[]);
    }, []);

    useEffect(() => { fetchFollowing(); fetchNews(); fetchAllUsers(); }, [fetchFollowing, fetchNews, fetchAllUsers]);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 1) { fetchAllUsers(); return; }
        setLoading(true);
        const { data } = await supabase
            .from('users')
            .select('id, username, avatar_url, is_verified, subscription_tier')
            .ilike('username', `%${query.trim()}%`)
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