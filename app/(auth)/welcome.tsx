import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';

function CandlestickChart() {
  const candles: [number, number, number, number, number, boolean][] = [
    [30, 105, 28, 95, 140, true],
    [65, 88, 30, 80, 125, false],
    [100, 72, 35, 60, 115, true],
    [135, 90, 25, 82, 120, false],
    [170, 55, 42, 40, 108, true],
    [205, 70, 28, 62, 105, false],
    [240, 52, 38, 42, 100, true],
  ];

  return (
    <Svg width="300" height="180" viewBox="0 0 280 180">
      {[45, 90, 135].map(y => (
        <Line
          key={y} x1="0" y1={y} x2="280" y2={y}
          stroke="rgba(240,185,11,0.12)" strokeWidth="1" strokeDasharray="5,4"
        />
      ))}
      {candles.map(([x, bodyTop, bodyH, wickTop, wickBot, green], i) => (
        <Svg key={i}>
          <Line x1={x} y1={wickTop} x2={x} y2={wickBot}
            stroke={green ? '#0ECB81' : '#F6465D'} strokeWidth="1.5" />
          <Rect x={x - 9} y={bodyTop} width={18} height={bodyH}
            fill={green ? '#0ECB81' : '#F6465D'} rx={2} opacity={0.9} />
        </Svg>
      ))}
      <Polyline
        points="30,119 65,103 100,89 135,103 170,76 205,84 240,71"
        fill="none" stroke="#F0B90B" strokeWidth="2"
        strokeDasharray="6,4" opacity={0.7}
      />
    </Svg>
  );
}

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.root}>
      <Animated.Text entering={FadeIn.duration(600)} style={s.logo}>
        Ticksnap
      </Animated.Text>

      <Animated.View entering={FadeInDown.delay(200).duration(700)} style={s.chartWrap}>
        <View style={s.chartCard}>
          <CandlestickChart />
        </View>
        <View style={s.dotsRow}>
          {[0, 1, 2].map(i => <View key={i} style={s.dot} />)}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(700)} style={s.bottom}>
        <Text style={s.headline}>{'Trade Smarter.\nJournal Better.'}</Text>
        <Text style={s.sub}>Made for traders by traders</Text>

        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={s.primaryBtnText}>Log In to Account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.85}
        >
          <Text style={s.secondaryBtnText}>Create New Account</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0E11',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    marginTop: 48,
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#F0B90B',
    letterSpacing: -0.5,
  },
  chartWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCard: {
    backgroundColor: '#1E2026',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2B2F36',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2B2F36',
  },
  bottom: {
    width: '100%',
    paddingBottom: 32,
    gap: 12,
  },
  headline: {
    fontSize: 28,
    fontWeight: '900',
    color: '#EAECEF',
    textAlign: 'center',
    lineHeight: 36,
  },
  sub: {
    fontSize: 14,
    fontWeight: '500',
    color: '#848E9C',
    textAlign: 'center',
    marginBottom: 4,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#F0B90B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#0B0E11',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryBtn: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B2F36',
  },
  secondaryBtnText: {
    color: '#EAECEF',
    fontSize: 15,
    fontWeight: '700',
  },
});