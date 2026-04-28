import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export type Forecast = {
  id: string;
  user_id: string;
  content: string;
  chart_image_url: string | null;
  currency_pair: string;
  profit: number;
  likes_count: number;
  created_at: string;
  users?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
};

type Props = {
  forecast: Forecast;
  onPress?: () => void;
  onLike?: () => void;
  onWatch?: () => void;
  isLiked?: boolean;
  isWatched?: boolean;
};

function Avatar({
  url,
  username,
  size = 40,
}: {
  url?: string | null;
  username: string;
  size?: number;
}) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarInitial, { fontSize: size * 0.38 }]}>
        {username?.[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ForecastCard({
  forecast,
  onPress,
  onLike,
  onWatch,
  isLiked = false,
  isWatched = false,
}: Props) {
  const user = forecast.users;
  const isProfitable = forecast.profit >= 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Avatar url={user?.avatar_url} username={user?.username ?? '?'} />
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.username}>@{user?.username ?? 'unknown'}</Text>
            {user?.is_verified && (
              <MaterialIcons name="verified" size={14} color="#F5C400" />
            )}
          </View>
          <Text style={styles.time}>{timeAgo(forecast.created_at)}</Text>
        </View>
        <View
          style={[
            styles.pairBadge,
            { backgroundColor: isProfitable ? '#ecfdf5' : '#fef2f2' },
          ]}
        >
          <Text
            style={[
              styles.pairText,
              { color: isProfitable ? '#059669' : '#dc2626' },
            ]}
          >
            {forecast.currency_pair}
          </Text>
        </View>
      </View>

      {/* Content */}
      {forecast.content ? (
        <Text style={styles.content} numberOfLines={3}>
          {forecast.content}
        </Text>
      ) : null}

      {/* Chart image */}
      {forecast.chart_image_url ? (
        <Image
          source={{ uri: forecast.chart_image_url }}
          style={styles.chartImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.chartPlaceholder}>
          <MaterialIcons name="show-chart" size={32} color="#ddd" />
          <Text style={styles.chartPlaceholderText}>Chart analysis</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.profitBadge}>
          <FontAwesome
            name={isProfitable ? 'arrow-up' : 'arrow-down'}
            size={11}
            color={isProfitable ? '#059669' : '#dc2626'}
          />
          <Text
            style={[
              styles.profitText,
              { color: isProfitable ? '#059669' : '#dc2626' },
            ]}
          >
            {isProfitable ? '+' : ''}{forecast.profit.toFixed(1)}%
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
            <FontAwesome
              name={isLiked ? 'heart' : 'heart-o'}
              size={16}
              color={isLiked ? '#ef4444' : '#999'}
            />
            <Text style={styles.actionCount}>{forecast.likes_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.watchBtn, isWatched && styles.watchBtnActive]}
            onPress={onWatch}
          >
            <FontAwesome
              name={isWatched ? 'eye' : 'eye'}
              size={13}
              color={isWatched ? '#1a1a1a' : '#fff'}
            />
            <Text style={[styles.watchText, isWatched && styles.watchTextActive]}>
              {isWatched ? 'Watching' : 'Watch'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarFallback: {
    backgroundColor: '#F5C400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontWeight: '800',
    color: '#1a1a1a',
  },
  userInfo: { flex: 1, gap: 2 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  username: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  time: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  pairBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  pairText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  content: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
    fontWeight: '400',
  },
  chartImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  chartPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  chartPlaceholderText: {
    fontSize: 13,
    color: '#ccc',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  profitText: { fontSize: 14, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: { fontSize: 13, color: '#666', fontWeight: '600' },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  watchBtnActive: {
    backgroundColor: '#F5C400',
  },
  watchText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  watchTextActive: { color: '#1a1a1a' },
});