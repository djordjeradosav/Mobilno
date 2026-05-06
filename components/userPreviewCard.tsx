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
            style={styles.card}
            onPress={handleCardPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <Avatar url={avatar_url} username={username} size={56} />
                <View style={styles.headerInfo}>
                    <View style={styles.usernameRow}>
                        <Text style={styles.username}>@{username}</Text>
                        {is_verified && (
                            <MaterialIcons name="verified" size={16} color="#F5C400" />
                        )}
                    </View>
                    <Text style={styles.tier}>{subscription_tier} member</Text>
                </View>
                {onFollowPress && (
                    <TouchableOpacity
                        style={[
                            styles.followBtn,
                            isFollowing && styles.followingBtn
                        ]}
                        onPress={handleFollowPress}
                    >
                        <Text style={[
                            styles.followBtnText,
                            isFollowing && styles.followingBtnText
                        ]}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{followerCount}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{followingCount}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
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
        color: '#1a1a1a',
    },
    tier: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    followBtn: {
        backgroundColor: '#F5C400',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 8,
    },
    followingBtn: {
        backgroundColor: '#eee',
    },
    followBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    followingBtnText: {
        color: '#888',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#f9f9f7',
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
        color: '#1a1a1a',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#eee',
    },
});


