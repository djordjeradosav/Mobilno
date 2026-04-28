import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';

function CandlestickChart() {
  // [x, bodyTop, bodyHeight, wickTop, wickBottom, green]
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
    <Svg width="280" height="180" viewBox="0 0 280 180">
      {[45, 90, 135].map((y) => (
        <Line
          key={y} x1="0" y1={y} x2="280" y2={y}
          stroke="rgba(0,0,0,0.08)" strokeWidth="1" strokeDasharray="5,4"
        />
      ))}
      {candles.map(([x, bodyTop, bodyH, wickTop, wickBot, green], i) => (
        <Animated.View key={i}>
          <Line x1={x} y1={wickTop} x2={x} y2={wickBot}
            stroke="#1a1a1a" strokeWidth="1.5" />
          <Rect x={x - 9} y={bodyTop} width={18} height={bodyH}
            fill={green ? '#1a1a1a' : 'rgba(0,0,0,0.22)'} rx={2} />
        </Animated.View>
      ))}
      <Polyline
        points="30,119 65,103 100,89 135,103 170,76 205,84 240,71"
        fill="none" stroke="#F5C400" strokeWidth="2.5"
        strokeDasharray="6,4" opacity={0.8}
      />
    </Svg>
  );
}

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container}>
      <Animated.Text entering={FadeIn.duration(500)} style={s.logo}>
        Ticksnap
      </Animated.Text>

      <Animated.View
        entering={FadeInDown.delay(200).duration(600)}
        style={s.chartArea}
      >
        <CandlestickChart />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(600)}
        style={s.bottom}
      >
        <Text style={s.title}>Welcome to Ticksnap</Text>
        <Text style={s.subtitle}>Made for Traders by Traders</Text>

        <TouchableOpacity
          style={s.loginBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={s.loginBtnText}>Login to your account →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.registerBtn}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.85}
        >
          <Text style={s.registerBtnText}>Create new account</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5C400',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    marginTop: 40,
    fontSize: 28,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#111111',
    letterSpacing: -1,
  },
  chartArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    width: '100%',
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#444444',
    marginBottom: 28,
    textAlign: 'center',
  },
  loginBtn: {
    width: '100%',
    backgroundColor: '#111111',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerBtn: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#111111',
  },
  registerBtnText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '500',
  },
});
