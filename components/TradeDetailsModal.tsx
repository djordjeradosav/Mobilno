import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Forecast } from './ForecastCard';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.85;

type Props = {
    visible: boolean;
    forecast: Forecast | null;
    onClose: () => void;
    onLike: (id: string) => void;
    isLiked: boolean;
    currentUserId?: string;
};

function Avatar({ url, username }: { url?: string | null; username: string }) {
    if (url) {
        return <Image source={{ uri: url }} style={styles.avatar} />;
    }
    return (
        <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{username?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
    );
}

export default function TradeDetailsModal({
    visible,
    forecast,
    onClose,
    onLike,
    isLiked,
    currentUserId,
}: Props) {
    const slideAnim = useRef(new Animated.Value(SHEET_H)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 280,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SHEET_H,
                    duration: 260,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, { dy }) => dy > 10,
            onPanResponderMove: (_, { dy }) => {
                if (dy > 0) slideAnim.setValue(dy);
            },
            onPanResponderRelease: (_, { dy, vy }) => {
                if (dy > 120 || vy > 1.2) {
                    onClose();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        tension: 65,
                        friction: 11,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    if (!forecast) return null;

    const user = forecast.users;
    const isProfitable = forecast.profit >= 0;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            {/* Backdrop */}
            <Animated.View
                style={[styles.backdrop, { opacity: backdropAnim }]}
            >
                <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
            </Animated.View>

            {/* Sheet */}
            <Animated.View
                style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
            >
                {/* Drag handle */}
                <View {...panResponder.panHandlers} style={styles.handleArea}>
                    <View style={styles.handle} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Avatar url={user?.avatar_url} username={user?.username ?? '?'} />
                        <View style={styles.headerInfo}>
                            <View style={styles.usernameRow}>
                                <Text style={styles.username}>@{user?.username ?? 'unknown'}</Text>
                                {user?.is_verified && (
                                    <MaterialIcons name="verified" size={16} color="#F5C400" />
                                )}
                            </View>
                            <Text style={styles.timestamp}>
                                {new Date(forecast.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <FontAwesome name="times" size={16} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* Stats row */}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Pair</Text>
                            <Text style={styles.statValue}>{forecast.currency_pair}</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Return</Text>
                            <Text
                                style={[
                                    styles.statValue,
                                    { color: isProfitable ? '#059669' : '#dc2626' },
                                ]}
                            >
                                {isProfitable ? '+' : ''}{forecast.profit.toFixed(2)}%
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statLabel}>Likes</Text>
                            <Text style={styles.statValue}>{forecast.likes_count}</Text>
                        </View>
                    </View>

                    {/* Chart */}
                    {forecast.chart_image_url ? (
                        <Image
                            source={{ uri: forecast.chart_image_url }}
                            style={styles.chartImage}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={styles.chartPlaceholder}>
                            <MaterialIcons name="show-chart" size={48} color="#ddd" />
                            <Text style={styles.placeholderText}>No chart attached</Text>
                        </View>
                    )}

                    {/* Analysis text */}
                    {forecast.content ? (
                        <View style={styles.analysisBox}>
                            <Text style={styles.analysisTitle}>Analysis</Text>
                            <Text style={styles.analysisText}>{forecast.content}</Text>
                        </View>
                    ) : null}

                    {/* Like button */}
                    <TouchableOpacity
                        style={[styles.likeBtn, isLiked && styles.likeBtnActive]}
                        onPress={() => onLike(forecast.id)}
                        activeOpacity={0.85}
                    >
                        <FontAwesome
                            name={isLiked ? 'heart' : 'heart-o'}
                            size={18}
                            color={isLiked ? '#fff' : '#1a1a1a'}
                        />
                        <Text style={[styles.likeBtnText, isLiked && styles.likeBtnTextActive]}>
                            {isLiked ? 'Liked' : 'Like this trade'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
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
    handleArea: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ddd',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
        gap: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarFallback: {
        backgroundColor: '#F5C400',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1a1a1a',
    },
    headerInfo: { flex: 1, gap: 3 },
    usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    username: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
    timestamp: { fontSize: 12, color: '#aaa', fontWeight: '500' },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#f0f0ee',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    stat: { flex: 1, alignItems: 'center', gap: 4 },
    statLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', letterSpacing: 0.5 },
    statValue: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
    statDivider: { width: 1, height: 36, backgroundColor: '#eee' },
    chartImage: {
        width: '100%',
        height: 240,
        borderRadius: 16,
        backgroundColor: '#f5f5f5',
    },
    chartPlaceholder: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        backgroundColor: '#f8f8f8',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#eee',
    },
    placeholderText: { fontSize: 14, color: '#ccc', fontWeight: '600' },
    analysisBox: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    analysisTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1a1a1a',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    analysisText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 23,
    },
    likeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#f0f0ee',
        borderRadius: 16,
        paddingVertical: 18,
        marginTop: 4,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    likeBtnActive: {
        backgroundColor: '#ef4444',
        borderColor: '#ef4444',
    },
    likeBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    likeBtnTextActive: {
        color: '#fff',
    },
});