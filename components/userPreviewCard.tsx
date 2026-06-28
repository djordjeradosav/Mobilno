import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useRouter } from 'expo-router';
import { useTheme } from '@/components/ThemeContext';
import Colors from '@/constants/Colors';

type UserPreviewCardProps = {
    id: string;
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
    subscription_tier: string;
    followerCount?: number;
    followingCount?: number;
    isFollowing?: boolean;
    onFollowPress?: (userId: string) => void;
};

export default function UserPreviewCard({
    id,
    username,
    avatar_url,
    is_verified,
    subscription_tier,
    followerCount = 0,
    followingCount = 0,
    isFollowing = false,
    onFollowPress,
}: UserPreviewCardProps) {
    const router = useRouter();
    const { colorScheme } = useTheme();
    const C = Colors[colorScheme];

    const handleCardPress = () => {
        router.push(`/user-profile?userId=${id}`);
    };

    const handleFollowPress = () => {
        if (onFollowPress) {
            onFollowPress(id);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: C.card, shadowColor: C.text }]}
            onPress={handleCardPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <Avatar url={avatar_url} username={username} size={56} />
                <View style={styles.headerInfo}>
                    <View style={styles.usernameRow}>
                        <Text style={[styles.username, { color: C.text }]}>@{username}</Text>
                        {is_verified && (
                            <MaterialIcons name="verified" size={16} color={C.accent} />
                        )}
                    </View>
                    <Text style={[styles.tier, { color: C.textMuted }]}>{subscription_tier} member</Text>
                </View>
                {onFollowPress && (
                    <TouchableOpacity
                        style={[
                            styles.followBtn,
                            { backgroundColor: C.accent },
                            isFollowing && { backgroundColor: C.surface }
                        ]}
                        onPress={handleFollowPress}
                    >
                        <Text style={[
                            styles.followBtnText,
                            { color: C.textInverse },
                            isFollowing && { color: C.textMuted }
                        ]}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={[styles.statsRow, { backgroundColor: C.surface }]}>
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: C.text }]}>{followerCount}</Text>
                    <Text style={[styles.statLabel, { color: C.textMuted }]}>Followers</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: C.border }]} />
                <View style={styles.stat}>
                    <Text style={[styles.statValue, { color: C.text }]}>{followingCount}</Text>
                    <Text style={[styles.statLabel, { color: C.textMuted }]}>Following</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        gap: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerInfo: {
        flex: 1,
        gap: 4,
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    username: {
        fontSize: 16,
        fontWeight: '800',
    },
    tier: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    followBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
    },
    followBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
    },
    stat: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statDivider: {
        width: 1,
        height: 20,
    },
});
