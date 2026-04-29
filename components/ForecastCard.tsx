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
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

/**
 * Converts a TradingView chart URL to a direct image URL.
 * Example: https://www.tradingview.com/x/ABCDEFG/ -> https://www.tradingview.com/x/ABCDEFG.png
 */
export function getTradingViewImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.includes('tradingview.com/x/')) {
    // If it's a sharing link like /x/ID/, append .png if not present
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');
    if (!cleanUrl.endsWith('.png')) {
      return `${cleanUrl}.png`;
    }
    return cleanUrl;
  }
  return url;
}

export type Forecast = {
  id: string;
  user_id: string;
  content: string;
  chart_image_url: string | null;
  currency_pair: string;
  profit: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  // New fields
  trade_date?: string;
  trade_type?: 'Buy' | 'Sell';
  entry_price?: number;
  exit_price?: number;
  money_value?: number;
  tradingview_link?: string;
  notes?: string;
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
  isLiked?: boolean;
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
  isLiked = false,
}: Props) {
  const router = useRouter();
  const user = forecast.users;
  const isProfitable = forecast.profit >= 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={() => router.push(`/user-profile?userId=${forecast.user_id}`)} style={styles.userClickable}>
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
        </TouchableOpacity>
        <View style={styles.badgeRow}>
          {forecast.trade_type && (
            <View style={[styles.typeBadge, { backgroundColor: forecast.trade_type === 'Buy' ? '#EBF8FF' : '#FFF5F5' }]}>
              <Text style={[styles.typeBadgeText, { color: forecast.trade_type === 'Buy' ? '#3182CE' : '#E53E3E' }]}>{forecast.trade_type}</Text>
            </View>
          )}
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
      </View>

      {forecast.content ? (
        <Text style={styles.content} numberOfLines={3}>
          {forecast.content}
        </Text>
      ) : null}

      {forecast.chart_image_url && (
        <Image
          source={{ uri: getTradingViewImageUrl(forecast.chart_image_url) || '' }}
          style={styles.chartImage}
          resizeMode="cover"
        />
      )}

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

          <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
            <FontAwesome name="comment-o" size={16} color="#999" />
            <Text style={styles.actionCount}>{forecast.comments_count || 0}</Text>
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userClickable: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarFallback: { backgroundColor: '#F5C400', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontWeight: '800', color: '#1a1a1a' },
  userInfo: { flex: 1, gap: 2 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  username: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  time: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  badgeRow: { flexDirection: 'row', gap: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '800' },
  pairBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pairText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  content: { fontSize: 14, color: '#444', lineHeight: 21, fontWeight: '400' },
  chartImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#f5f5f5' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profitBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8f8f8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  profitText: { fontSize: 14, fontWeight: '800' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionCount: { fontSize: 13, color: '#666', fontWeight: '600' },
});