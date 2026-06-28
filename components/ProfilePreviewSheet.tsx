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
import { useTheme } from '@/components/ThemeContext';
import Colors from '@/constants/Colors';

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
    const { colorScheme } = useTheme();
    const C = Colors[colorScheme];

    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const [detail, setDetail] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

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
                supabase.from('trades').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', uid),
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', uid),
                currentUserId
                    ? supabase.from('follows').select('*').eq('follower_id', currentUserId).eq('followed_id', uid).maybeSingle()
                    : Promise.resolve({ data: null }),
            ]);

            const forecasts = (forecastsRes.data || []) as Trade[];
            const totalPL = forecasts.reduce((sum, t) => sum + (t.money_value || 0), 0);

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
        if (!currentUserId || !userId || currentUserId === userId) return;
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

                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }], backgroundColor: C.background }]}>
                    <View {...panResponder.panHandlers} style={styles.handleArea}>
                        <View style={[styles.handle, { backgroundColor: C.border }]} />
                    </View>

                    {loading || !detail ? (
                        <View style={styles.loader}>
                            <ActivityIndicator size="large" color={C.accent} />
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                            <View style={styles.profileHeader}>
                                <Avatar url={detail.avatar_url} username={detail.username} size={72} />
                                <View style={styles.profileInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={[styles.username, { color: C.text }]}>@{detail.username}</Text>
                                        {detail.is_verified && (
                                            <MaterialIcons name="verified" size={16} color={C.accent} />
                                        )}
                                        <View style={[styles.tierBadge, { backgroundColor: C.surface }, detail.subscription_tier === 'pro' && { backgroundColor: C.accent }]}>
                                            <Text style={[styles.tierText, { color: C.textMuted }, detail.subscription_tier === 'pro' && { color: C.textInverse }]}>
                                                {(detail.subscription_tier || 'FREE').toUpperCase()}
                                            </Text>
                                        </View>
                                    </View>
                                    {detail.member_since && (
                                        <Text style={[styles.memberSince, { color: C.textMuted }]}>
                                            Joined {new Date(detail.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            <View style={[styles.statsRow, { backgroundColor: C.surface }]}>
                                <View style={styles.stat}>
                                    <Text style={[styles.statNum, { color: C.text }]}>{detail.followerCount}</Text>
                                    <Text style={[styles.statLabel, { color: C.textMuted }]}>Followers</Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: C.divider }]} />
                                <View style={styles.stat}>
                                    <Text style={[styles.statNum, { color: C.text }]}>{detail.followingCount}</Text>
                                    <Text style={[styles.statLabel, { color: C.textMuted }]}>Following</Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: C.divider }]} />
                                <View style={styles.stat}>
                                    <Text style={[styles.statNum, { color: C.text }]}>{detail.tradeCount}</Text>
                                    <Text style={[styles.statLabel, { color: C.textMuted }]}>Trades</Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: C.divider }]} />
                                <View style={styles.stat}>
                                    <Text style={[styles.statNum, { color: detail.totalPL >= 0 ? C.success : C.danger }]}>
                                        {detail.totalPL >= 0 ? '+' : '-'}${Math.abs(detail.totalPL).toFixed(0)}
                                    </Text>
                                    <Text style={[styles.statLabel, { color: C.textMuted }]}>Total P&L</Text>
                                </View>
                            </View>

                            <View style={styles.actionRow}>
                                {currentUserId !== userId && (
                                    <TouchableOpacity
                                        style={[styles.followBtn, { backgroundColor: C.accent }, isFollowing && { backgroundColor: C.surface }]}
                                        onPress={handleFollowToggle}
                                        disabled={followLoading}
                                    >
                                        {followLoading
                                            ? <ActivityIndicator size="small" color={isFollowing ? C.textMuted : C.textInverse} />
                                            : <Text style={[styles.followBtnText, { color: C.textInverse }, isFollowing && { color: C.textMuted }]}>
                                                {isFollowing ? '✓ Following' : 'Follow'}
                                            </Text>
                                        }
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.viewProfileBtn, { backgroundColor: C.text }]}
                                    onPress={() => {
                                        onClose();
                                        setTimeout(() => router.push(`/user-profile?userId=${userId}`), 300);
                                    }}
                                >
                                    <Text style={[styles.viewProfileText, { color: C.background }]}>Full profile →</Text>
                                </TouchableOpacity>
                            </View>

                            {detail.recentTrades.length > 0 && (
                                <View style={[styles.tradesSection, { backgroundColor: C.surface }]}>
                                    <Text style={[styles.sectionTitle, { color: C.text }]}>Recent Trades</Text>
                                    {detail.recentTrades.map(trade => (
                                        <TouchableOpacity key={trade.id} style={styles.tradeRow} onPress={() => handleForecastPress(trade)}>
                                            <View style={[styles.tradeTypeDot, {
                                                backgroundColor: (trade.money_value || 0) >= 0 ? C.success : C.danger
                                            }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.tradeSymbol, { color: C.text }]}>{trade.symbol}</Text>
                                                <Text style={[styles.tradeDate, { color: C.textMuted }]}>
                                                    {new Date(trade.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </Text>
                                            </View>
                                            <Text style={[styles.tradePL, { color: (trade.money_value || 0) >= 0 ? C.success : C.danger }]}>
                                                {(trade.money_value || 0) >= 0 ? '+' : '-'}${Math.abs(trade.money_value || 0).toFixed(2)}
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
                onLike={() => { }}
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
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    handleArea: { paddingVertical: 14, alignItems: 'center' },
    handle: { width: 40, height: 4, borderRadius: 2 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 20, gap: 20, paddingBottom: 60 },
    profileHeader: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    profileInfo: { flex: 1, gap: 6 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    username: { fontSize: 20, fontWeight: '900' },
    tierBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    tierText: { fontSize: 9, fontWeight: '800' },
    memberSince: { fontSize: 12, fontWeight: '500' },
    statsRow: {
        flexDirection: 'row',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statNum: { fontSize: 17, fontWeight: '900' },
    statLabel: { fontSize: 11, fontWeight: '600' },
    statDivider: { width: 1, height: 28 },
    actionRow: { flexDirection: 'row', gap: 10 },
    followBtn: {
        flex: 1,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    followBtnText: { fontSize: 14, fontWeight: '800' },
    viewProfileBtn: {
        height: 46,
        paddingHorizontal: 18,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewProfileText: { fontSize: 13, fontWeight: '700' },
    tradesSection: { borderRadius: 20, padding: 16, gap: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '800' },
    tradeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    tradeTypeDot: { width: 8, height: 8, borderRadius: 4 },
    tradeSymbol: { fontSize: 14, fontWeight: '800' },
    tradeDate: { fontSize: 11, fontWeight: '500' },
    tradePL: { fontSize: 14, fontWeight: '900' },
});