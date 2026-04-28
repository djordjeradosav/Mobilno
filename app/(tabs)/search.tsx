import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
    Linking,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserProfile = {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    subscription_tier: string;
};

type NewsItem = {
    id: string;
    title: string;
    summary: string;
    url: string;
    date: string;
    source: string;
};

function Avatar({ url, username, size = 44 }: { url?: string | null; username: string; size?: number }) {
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

export default function Search() {
    const router = useRouter();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<UserProfile[]>([]);
    const [news, setNews] = useState<NewsItem[]>([]);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [loadingNews, setLoadingNews] = useState(true);

    const fetchFollowing = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('follows')
            .select('followed_id')
            .eq('follower_id', user.id);

        if (error) console.error('[fetchFollowing]', error.message);
        if (data) {
            setFollowingIds(new Set(data.map(f => f.followed_id)));
        }
    }, [user?.id]);

    const fetchNews = useCallback(async () => {
        setLoadingNews(true);
        try {
            const apiKey = process.env.EXPO_PUBLIC_NEWS_API_KEY;

            if (!apiKey) {
                console.warn('[fetchNews] No NewsAPI key found. Using mock data.');
                // Fallback to mock data if no API key
                const mockNews: NewsItem[] = [
                    {
                        id: '1',
                        title: 'Fed Signals Potential Rate Cuts Later This Year',
                        summary: 'Federal Reserve officials indicated that while inflation remains a concern, the path to lower rates is becoming clearer...',
                        url: 'https://www.reuters.com/markets/us/',
                        date: '2 hours ago',
                        source: 'Reuters'
                    },
                    {
                        id: '2',
                        title: 'Bitcoin Hits New All-Time High Amid ETF Inflows',
                        summary: 'The worlds largest cryptocurrency surged past previous records as institutional demand continues to grow through spot ETFs...',
                        url: 'https://www.coindesk.com/',
                        date: '4 hours ago',
                        source: 'CoinDesk'
                    },
                    {
                        id: '3',
                        title: 'Tech Stocks Rally on Strong Earnings Reports',
                        summary: 'Major technology companies reported better-than-expected quarterly results, driving the Nasdaq to significant gains...',
                        url: 'https://www.bloomberg.com/markets',
                        date: '6 hours ago',
                        source: 'Bloomberg'
                    }
                ];
                setNews(mockNews);
                setLoadingNews(false);
                return;
            }

            // Fetch from NewsAPI.org
            const response = await fetch(
                `https://newsapi.org/v2/everything?q=finance+OR+forex+OR+crypto+OR+stocks&sortBy=publishedAt&language=en&pageSize=10&apiKey=${apiKey}`
            );

            if (!response.ok) {
                throw new Error(`NewsAPI error: ${response.status}`);
            }

            const data = await response.json();

            if (data.articles && Array.isArray(data.articles)) {
                const formattedNews: NewsItem[] = data.articles.map((article: any, index: number) => {
                    const publishedDate = new Date(article.publishedAt);
                    const now = new Date();
                    const diffMs = now.getTime() - publishedDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    let timeAgo = 'just now';
                    if (diffMins > 0 && diffMins < 60) timeAgo = `${diffMins}m ago`;
                    else if (diffHours > 0 && diffHours < 24) timeAgo = `${diffHours}h ago`;
                    else if (diffDays > 0) timeAgo = `${diffDays}d ago`;

                    return {
                        id: `${index}-${article.url}`,
                        title: article.title || 'Untitled',
                        summary: article.description || article.content || 'No summary available',
                        url: article.url,
                        date: timeAgo,
                        source: article.source?.name || 'Unknown Source'
                    };
                });
                setNews(formattedNews);
            }
        } catch (error) {
            console.error('[fetchNews]', error);
            // Fallback to mock data on error
            const mockNews: NewsItem[] = [
                {
                    id: '1',
                    title: 'Fed Signals Potential Rate Cuts Later This Year',
                    summary: 'Federal Reserve officials indicated that while inflation remains a concern, the path to lower rates is becoming clearer...',
                    url: 'https://www.reuters.com/markets/us/',
                    date: '2 hours ago',
                    source: 'Reuters'
                },
                {
                    id: '2',
                    title: 'Bitcoin Hits New All-Time High Amid ETF Inflows',
                    summary: 'The worlds largest cryptocurrency surged past previous records as institutional demand continues to grow through spot ETFs...',
                    url: 'https://www.coindesk.com/',
                    date: '4 hours ago',
                    source: 'CoinDesk'
                }
            ];
            setNews(mockNews);
        } finally {
            setLoadingNews(false);
        }
    }, []);

    useEffect(() => {
        fetchFollowing();
        fetchNews();
    }, [fetchFollowing, fetchNews]);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 1) {
            setResults([]);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('id, username, avatar_url, is_verified, subscription_tier')
            .ilike('username', `%${query.trim()}%`)
            .neq('id', user?.id ?? '')
            .limit(10);

        setLoading(false);
        if (error) {
            console.error('[handleSearch]', error.message);
            return;
        }
        if (data) setResults(data as UserProfile[]);
    };

    const toggleFollow = async (targetUserId: string) => {
        if (!user?.id) return;
        const isFollowing = followingIds.has(targetUserId);

        setFollowingIds(prev => {
            const next = new Set(prev);
            if (isFollowing) next.delete(targetUserId);
            else next.add(targetUserId);
            return next;
        });

        if (isFollowing) {
            const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('followed_id', targetUserId);
            if (error) {
                Alert.alert('Error', 'Could not unfollow user');
                fetchFollowing();
            }
        } else {
            const { error } = await supabase
                .from('follows')
                .insert({ follower_id: user.id, followed_id: targetUserId });
            if (error) {
                Alert.alert('Error', 'Could not follow user');
                fetchFollowing();
            }
        }
    };

    const openArticle = (url: string) => {
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open the article'));
    };

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Explore</Text>
            </View>

            <View style={styles.searchBar}>
                <FontAwesome name="search" size={16} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search traders..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {loading && <ActivityIndicator size="small" color="#F5C400" />}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {results.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Traders</Text>
                        {results.map(item => (
                            <TouchableOpacity key={item.id} style={styles.userRow} onPress={() => router.push(`/user-profile?userId=${item.id}`)} activeOpacity={0.7}>
                                <Avatar url={item.avatar_url} username={item.username} />
                                <View style={styles.userInfo}>
                                    <View style={styles.userNameRow}>
                                        <Text style={styles.username}>@{item.username}</Text>
                                        {item.is_verified && (
                                            <MaterialIcons name="verified" size={14} color="#F5C400" />
                                        )}
                                    </View>
                                    <Text style={styles.tier}>{item.subscription_tier} member</Text>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.followBtn,
                                        followingIds.has(item.id) && styles.followBtnActive
                                    ]}
                                    onPress={(e) => { e.stopPropagation(); toggleFollow(item.id); }}
                                >
                                    <Text style={[
                                        styles.followBtnText,
                                        followingIds.has(item.id) && styles.followBtnTextActive
                                    ]}>
                                        {followingIds.has(item.id) ? 'Following' : 'Follow'}
                                    </Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📰 Market News</Text>
                    {loadingNews ? (
                        <ActivityIndicator color="#F5C400" style={{ marginTop: 20 }} />
                    ) : (
                        news.map(item => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.newsCard}
                                onPress={() => openArticle(item.url)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.newsHeader}>
                                    <Text style={styles.newsSource}>{item.source}</Text>
                                    <Text style={styles.newsDate}>{item.date}</Text>
                                </View>
                                <Text style={styles.newsTitle}>{item.title}</Text>
                                <Text style={styles.newsSummary} numberOfLines={2}>{item.summary}</Text>
                                <View style={styles.readMore}>
                                    <Text style={styles.readMoreText}>Read full article</Text>
                                    <FontAwesome name="arrow-right" size={12} color="#F5C400" />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 52,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    searchInput: { flex: 1, fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    userInfo: { flex: 1, gap: 2 },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    username: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
    tier: { fontSize: 12, color: '#aaa', fontWeight: '500', textTransform: 'capitalize' },
    followBtn: {
        backgroundColor: '#F5C400',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    followBtnActive: { backgroundColor: '#f0f0ee' },
    followBtnText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
    followBtnTextActive: { color: '#888' },
    newsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    newsHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    newsSource: { fontSize: 12, fontWeight: '800', color: '#F5C400', textTransform: 'uppercase' },
    newsDate: { fontSize: 12, color: '#aaa', fontWeight: '500' },
    newsTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 6, lineHeight: 22 },
    newsSummary: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },
    readMore: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    readMoreText: { fontSize: 13, fontWeight: '700', color: '#F5C400' },
});