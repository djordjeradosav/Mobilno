import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const t = setTimeout(() => {
      router.replace(isSignedIn ? '/(tabs)/popular' : '/(auth)/welcome');
    }, 1500);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn]);

  return (
    <View style={styles.container}>
      {/* Candlestick decoration */}
      <View style={styles.candleRow}>
        <View style={styles.candleGroup}>
          <View style={[styles.wick, { height: 18 }]} />
          <View style={[styles.body, { height: 32, backgroundColor: '#1a1a1a' }]} />
          <View style={[styles.wick, { height: 10 }]} />
        </View>
        <View style={styles.candleGroup}>
          <View style={[styles.wick, { height: 24 }]} />
          <View style={[styles.body, { height: 48, backgroundColor: '#F5C400' }]} />
          <View style={[styles.wick, { height: 8 }]} />
        </View>
        <View style={styles.candleGroup}>
          <View style={[styles.wick, { height: 12 }]} />
          <View style={[styles.body, { height: 28, backgroundColor: '#1a1a1a' }]} />
          <View style={[styles.wick, { height: 16 }]} />
        </View>
        <View style={styles.candleGroup}>
          <View style={[styles.wick, { height: 20 }]} />
          <View style={[styles.body, { height: 56, backgroundColor: '#F5C400' }]} />
          <View style={[styles.wick, { height: 12 }]} />
        </View>
        <View style={styles.candleGroup}>
          <View style={[styles.wick, { height: 10 }]} />
          <View style={[styles.body, { height: 38, backgroundColor: '#1a1a1a' }]} />
          <View style={[styles.wick, { height: 20 }]} />
        </View>
      </View>

      <Text style={styles.logo}>Ticksnap</Text>
      <Text style={styles.tagline}>Trade. Share. Win.</Text>

      <View style={styles.dotsRow}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5C400',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  candleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 8,
  },
  candleGroup: {
    alignItems: 'center',
    gap: 0,
  },
  wick: {
    width: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
  },
  body: {
    width: 20,
    borderRadius: 3,
  },
  logo: {
    fontSize: 42,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#1a1a1a',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 3,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 32,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(26,26,26,0.3)',
  },
  dotActive: {
    backgroundColor: '#1a1a1a',
    width: 20,
  },
});