import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Avatar from './Avatar';
import { Trade } from './ForecastCard';
import TradeDetailsModal from './TradeDetailsModal';

const { height: SH } = Dimensions.get('window');
const SHEET_H = SH * 0.82;

type UserProfile = {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    subscription_tier: string;
};

type UserDetail = UserProfile & {
    member_since?: string;
    followerCount: number;
    followingCount: number;
    tradeCount: number;
    recentTrades: Trade[];
    totalPL: number;
};

type Props = {
    userId: string | null;
    visible: boolean;
    onClose: () => void;
    currentUserId?: string;
};

export default function ProfilePreviewSheet({
    userId,
    visible,
    onClose,
    currentUserId,
}: Props) {
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const [detail, setDetail] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Trade details modal
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
    const [tradeModalVisible, setTradeModalVisible] = useState(false);

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

        try {
            const [userRes, forecastsRes, followerRes, followingRes, followStatusRes] = await Promise.all([
                supabase.from('users').select('*').eq('id', uid).maybeSingle(),
                supabase.from('forecasts').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', uid),
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
                currentUserId
                    ? supabase.from('follows').select('*').eq('follower_id', currentUserId).eq('followed_id', uid).maybeSingle()
                    : Promise.resolve({ data: null }),
            ]);

            const forecasts = (forecastsRes.data || []) as Trade[];
            const totalPL = forecasts.reduce((sum, t) => sum + (t.profit || 0), 0);

            setIsFollowing(!!(followStatusRes as any).data);
            setDetail({
                ...(userRes.data as UserProfile),
                member_since: userRes.data?.member_since,
                followerCount: (followerRes as any).count ?? 0,
                followingCount: (followingRes as any).count ?? 0,
                tradeCount: (forecastsRes.data || []).length,
                recentTrades: forecasts,
                totalPL,
            });
        } catch (err) {
            console.error('[loadProfile]', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async () => {
        if (!currentUserId || !userId) return;
        setFollowLoading(true);
        try {
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
        } catch (err) {
            console.error('[handleFollowToggle]', err);
        } finally {
            setFollowLoading(false);
        }
    };

    const handleForecastPress = (forecast: Trade) => {
        if (detail) {
            // Inject user info into forecast for the modal
            const forecastWithUser = {
                ...forecast,
                users: {
                    username: detail.username,
                    avatar_url: detail.avatar_url,
                    is_verified: detail.is_verified
                }
            };
            setSelectedTrade(forecastWithUser as Trade);
            setTradeModalVisible(true);
        }
    };

    return (
        <>
            <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
                <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
                </Animated.View>

                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View {...panResponder.panHandlers} style={styles.handleArea}>
                        <View style={styles.handle} />
                    </View>

                    {loading || !detail ? (
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color="#F5C400" />
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                            <View style={styles.profileHeader}>
                                <Avatar url={detail.avatar_url} username={detail.username} size={72} />
                                <View style={styles.profileInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.username}>@{detail.username}</Text>
                                        {detail.is_verified && (
                                            <MaterialIcons name="verified" size={16} color="#F5C400" />
                                        )}
                                        <View style={[styles.tierBadge, detail.subscription_tier === 'pro' && styles.tierPro]}>
                                            <Text style={[styles.tierText, detail.subscription_tier === 'pro' && styles.tierProText]}>
                                                {(detail.subscription_tier || 'FREE').toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    {detail.member_since && (
                                        <Text style={styles.memberSince}>
                                            Joined {new Date(detail.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.stat}>
                                    <Text style={styles.statNum}>{detail.followerCount}</Text>
                                    <Text style={styles.statLabel}>Followers</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.stat}>
                                    <Text style={styles.statNum}>{detail.followingCount}</Text>
                                    <Text style={styles.statLabel}>Following</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.stat}>
                                    <Text style={styles.statNum}>{detail.tradeCount}</Text>
                                    <Text style={styles.statLabel}>Trades</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.stat}>
                                    <Text style={[styles.statNum, { color: detail.totalPL >= 0 ? '#059669' : '#dc2626' }]}>
                                        {detail.totalPL >= 0 ? '+' : '-'}${Math.abs(detail.totalPL).toFixed(0)}
                                    </Text>
                                    <Text style={styles.statLabel}>Total P&L</Text>
                                </View>
                            </View>

                            <View style={styles.actionRow}>
                                {currentUserId !== userId && (
                                    <TouchableOpacity
                                        style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                                        onPress={handleFollowToggle}
                                        disabled={followLoading}
                                    >
                                        {followLoading
                                            ? <ActivityIndicator size="small" color={isFollowing ? '#888' : '#1a1a1a'} />
                                            : <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                                                {isFollowing ? '✓ Following' : 'Follow'}
                                            </Text>
                                        }
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={styles.viewProfileBtn}
                                    onPress={() => {
                                        onClose();
                                        setTimeout(() => router.push(`/user-profile?userId=${userId}`), 300);
                                    }}
                                >
                                    <Text style={styles.viewProfileText}>Full profile →</Text>
                                </TouchableOpacity>
                            </View>

                            {detail.recentTrades.length > 0 && (
                                <View style={styles.tradesSection}>
                                    <Text style={styles.recentTradesTitle}>Recent Forecasts</Text>
                                    {detail.recentTrades.map(forecast => (
                                        <TouchableOpacity
                                            key={forecast.id}
                                            style={styles.tradeRow}
                                            onPress={() => handleForecastPress(forecast)}
                                        >
                                            <View style={[styles.tradeTypeDot, { backgroundColor: (forecast.profit || 0) >= 0 ? '#059669' : '#dc2626' }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.tradeSymbol}>{forecast.currency_pair}</Text>
                                                <Text style={styles.tradeDate}>
                                                    {new Date(forecast.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </Text>
                                            </View>
                                            <Text style={[styles.tradePL, { color: (forecast.profit || 0) >= 0 ? '#059669' : '#dc2626' }]}>
                                                {(forecast.profit || 0) >= 0 ? '+' : '-'}${Math.abs(forecast.profit || 0).toFixed(2)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    )}
                </Animated.View>
            </Modal >

            <TradeDetailsModal
                visible={tradeModalVisible}
                forecast={selectedTrade}
                onClose={() => setTradeModalVisible(false)}
                onLike={() => { }} // Not implemented in preview for now
                isLiked={false}
                currentUserId={currentUserId}
            />
        </>
    );
}

const styles = StyleSheet.create({
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
    tradeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    tradeTypeDot: { width: 8, height: 8, borderRadius: 4 },
    tradeSymbol: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
    tradeDate: { fontSize: 11, color: '#aaa', fontWeight: '500' },
    tradePL: { fontSize: 14, fontWeight: '900' },
});