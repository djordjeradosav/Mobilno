import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import { getForexNews, NewsItem as AVNewsItem } from '@/lib/news';

type UserProfile = {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    subscription_tier: string;
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
    const [news, setNews] = useState<AVNewsItem[]>([]);
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
            const latestNews = await getForexNews();
            setNews(latestNews);
        } catch (error) {
            console.error('[fetchNews]', error);
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

    const getTimeAgo = (timestamp: number) => {
        const diff = Math.floor(Date.now() / 1000 - timestamp);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
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
                                        followingIds.has(item.id) && styles.followingBtn
                                    ]}
                                    onPress={() => toggleFollow(item.id)}
                                >
                                    <Text style={[
                                        styles.followBtnText,
                                        followingIds.has(item.id) && styles.followingBtnText
                                    ]}>
                                        {followingIds.has(item.id) ? 'Following' : 'Follow'}
                                    </Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Latest Market News</Text>
                        {loadingNews && <ActivityIndicator size="small" color="#F5C400" />}
                    </View>
                    
                    {news.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.newsCard}
                            onPress={() => openArticle(item.url)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.newsContent}>
                                <View style={styles.newsHeader}>
                                    <Text style={styles.newsSource}>{item.source}</Text>
                                    <Text style={styles.newsDate}>{getTimeAgo(item.datetime)}</Text>
                                </View>
                                <Text style={styles.newsTitle} numberOfLines={2}>{item.headline}</Text>
                                <Text style={styles.newsSummary} numberOfLines={2}>{item.summary}</Text>
                                {item.tickers.length > 0 && (
                                    <View style={styles.tickerRow}>
                                        {item.tickers.map(t => (
                                            <View key={t} style={styles.tickerBadge}>
                                                <Text style={styles.tickerText}>{t}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                            {item.image && (
                                <Image source={{ uri: item.image }} style={styles.newsImage} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, paddingHorizontal: 16, height: 50, borderRadius: 14, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    searchInput: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
    section: { marginTop: 24, paddingHorizontal: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
    userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, marginBottom: 10, gap: 12 },
    userInfo: { flex: 1 },
    userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    username: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
    tier: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'capitalize' },
    followBtn: { backgroundColor: '#F5C400', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    followingBtn: { backgroundColor: '#eee' },
    followBtnText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
    followingBtnText: { color: '#888' },
    newsCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 12, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    newsContent: { flex: 1, gap: 4 },
    newsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    newsSource: { fontSize: 11, fontWeight: '800', color: '#F5C400', textTransform: 'uppercase' },
    newsDate: { fontSize: 11, color: '#bbb', fontWeight: '600' },
    newsTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', lineHeight: 20 },
    newsSummary: { fontSize: 13, color: '#666', lineHeight: 18, marginTop: 2 },
    newsImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#f5f5f5' },
    tickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    tickerBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    tickerText: { fontSize: 10, fontWeight: '700', color: '#666' },
});
