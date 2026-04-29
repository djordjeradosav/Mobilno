import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
    url?: string | null;
    username: string;
    size?: number;
}

export default function Avatar({ url, username, size = 44 }: AvatarProps) {
    if (url) {
        return (
            <Image 
                source={{ uri: url }} 
                style={{ width: size, height: size, borderRadius: size / 2 }} 
            />
        );
    }
    
    return (
        <View style={[
            styles.fallback, 
            { width: size, height: size, borderRadius: size / 2 }
        ]}>
            <Text style={[styles.fallbackText, { fontSize: size * 0.4 }]}>
                {username?.[0]?.toUpperCase() ?? '?'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    fallback: {
        backgroundColor: '#F5C400',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fallbackText: {
        fontWeight: '800',
        color: '#1a1a1a',
    },
});
