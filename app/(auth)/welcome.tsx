import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

function CandlestickChart() {
    const candles = [
        { wick: [14, 8], body: 28, bull: false },
        { wick: [10, 12], body: 44, bull: true },
        { wick: [18, 6], body: 20, bull: false },
        { wick: [8, 16], body: 52, bull: true },
        { wick: [12, 10], body: 36, bull: true },
        { wick: [20, 8], body: 24, bull: false },
        { wick: [6, 14], body: 60, bull: true },
        { wick: [10, 8], body: 32, bull: false },
    ];

    return (
        <View style={chart.container}>
            {/* Grid lines */}
            {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[chart.gridLine, { bottom: i * 30 + 20 }]} />
            ))}
            {/* Candles */}
            <View style={chart.candlesRow}>
                {candles.map((c, i) => (
                    <View key={i} style={chart.candleWrap}>
                        <View style={[chart.wick, { height: c.wick[0] }]} />
                        <View
                            style={[
                                chart.body,
                                {
                                    height: c.body,
                                    backgroundColor: c.bull ? '#1a1a1a' : 'rgba(26,26,26,0.25)',
                                    borderWidth: c.bull ? 0 : 2,
                                    borderColor: '#1a1a1a',
                                },
                            ]}
                        />
                        <View style={[chart.wick, { height: c.wick[1] }]} />
                    </View>
                ))}
            </View>
        </View>
    );
}

const chart = StyleSheet.create({
    container: {
        width: width - 48,
        height: 160,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(26,26,26,0.15)',
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'flex-end',
        padding: 16,
    },
    gridLine: {
        position: 'absolute',
        left: 16,
        right: 16,
        height: 1,
        backgroundColor: 'rgba(26,26,26,0.1)',
    },
    candlesRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    candleWrap: {
        alignItems: 'center',
        flex: 1,
    },
    wick: {
        width: 2,
        backgroundColor: '#1a1a1a',
        borderRadius: 1,
    },
    body: {
        width: '100%',
        maxWidth: 22,
        borderRadius: 4,
    },
});

export default function Welcome() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>TRADING INTELLIGENCE</Text>
                </View>
                <Text style={styles.logo}>Ticksnap</Text>
                <Text style={styles.subtitle}>
                    Share your best trades.{'\n'}Follow elite traders. Win together.
                </Text>
            </View>

            <CandlestickChart />

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statNum}>12K+</Text>
                    <Text style={styles.statLabel}>Traders</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={styles.statNum}>94K+</Text>
                    <Text style={styles.statLabel}>Forecasts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                    <Text style={styles.statNum}>$4.2M</Text>
                    <Text style={styles.statLabel}>Tracked Profit</Text>
                </View>
            </View>

            <View style={styles.buttons}>
                <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={() => router.push('/(auth)/register')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.btnPrimaryText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.btnSecondary}
                    onPress={() => router.push('/(auth)/login')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.btnSecondaryText}>Sign In</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.legal}>
                By continuing you agree to our Terms & Privacy Policy
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5C400',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 80,
        paddingBottom: 48,
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        gap: 12,
    },
    badge: {
        backgroundColor: 'rgba(26,26,26,0.12)',
        borderRadius: 100,
        paddingHorizontal: 14,
        paddingVertical: 5,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        color: '#1a1a1a',
    },
    logo: {
        fontSize: 52,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#1a1a1a',
        letterSpacing: -2,
    },
    subtitle: {
        fontSize: 16,
        color: '#1a1a1a',
        opacity: 0.7,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    stat: {
        alignItems: 'center',
        gap: 2,
    },
    statNum: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1a1a1a',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#1a1a1a',
        opacity: 0.6,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(26,26,26,0.2)',
    },
    buttons: {
        width: '100%',
        gap: 12,
    },
    btnPrimary: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
    },
    btnPrimaryText: {
        color: '#F5C400',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    btnSecondary: {
        backgroundColor: 'rgba(26,26,26,0.1)',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(26,26,26,0.2)',
    },
    btnSecondaryText: {
        color: '#1a1a1a',
        fontSize: 16,
        fontWeight: '700',
    },
    legal: {
        fontSize: 11,
        color: '#1a1a1a',
        opacity: 0.45,
        textAlign: 'center',
    },
});