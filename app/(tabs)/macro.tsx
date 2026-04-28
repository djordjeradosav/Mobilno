
import { FRED_SERIES, FredSeries, formatFredValue, getAllFredSeries, hasFredKey } from '@/lib/fred';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function MacroCard({ s }: { s: FredSeries }) {
    const v = s.latest;
    const change = s.changePct;
    const positive = (change ?? 0) >= 0;

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>{s.emoji}</Text>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{s.title}</Text>
                    <Text style={styles.cardId}>{s.id}</Text>
                </View>
            </View>

            <Text style={styles.cardValue}>
                {v ? formatFredValue(v.value, s.unit) : '—'}
            </Text>

            {change !== null && (
                <View style={[styles.chipRow]}>
                    <View
                        style={[
                            styles.changeChip,
                            { backgroundColor: positive ? '#ecfdf5' : '#fef2f2' },
                        ]}
                    >
                        <FontAwesome
                            name={positive ? 'arrow-up' : 'arrow-down'}
                            size={9}
                            color={positive ? '#059669' : '#dc2626'}
                        />
                        <Text
                            style={[
                                styles.changeText,
                                { color: positive ? '#059669' : '#dc2626' },
                            ]}
                        >
                            {Math.abs(change).toFixed(2)}%
                        </Text>
                    </View>
                    <Text style={styles.cardDate}>{v?.date}</Text>
                </View>
            )}

            {/* Tiny sparkline */}
            {s.observations.length > 1 && <Sparkline series={s.observations.slice(0, 18)} />}
        </View>
    );
}

function Sparkline({ series }: { series: { value: number }[] }) {
    const values = series.map((o) => o.value).reverse();
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return (
        <View style={styles.spark}>
            {values.map((v, i) => {
                const h = ((v - min) / range) * 32 + 4;
                return (
                    <View
                        key={i}
                        style={{
                            flex: 1,
                            height: h,
                            backgroundColor: '#F5C400',
                            opacity: 0.4 + (i / values.length) * 0.6,
                            borderRadius: 1.5,
                            marginRight: 1,
                        }}
                    />
                );
            })}
        </View>
    );
}

export default function Macro() {
    const [series, setSeries] = useState<FredSeries[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        const data = await getAllFredSeries();
        setSeries(data);
    }, []);

    useEffect(() => {
        if (!hasFredKey()) {
            setLoading(false);
            return;
        }
        (async () => {
            setLoading(true);
            await load();
            setLoading(false);
        })();
    }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    if (!hasFredKey()) {
        return (
            <SafeAreaView style={styles.root} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Macro</Text>
                    <Text style={styles.headerSub}>US economic indicators</Text>
                </View>
                <View style={styles.emptyBox}>
                    <MaterialIcons name="lock-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyTitle}>FRED API key required</Text>
                    <Text style={styles.emptyText}>
                        Get a free key at fredaccount.stlouisfed.org/apikeys, then ask the agent to wire it up.
                    </Text>
                    <TouchableOpacity
                        style={styles.linkBtn}
                        onPress={() => Linking.openURL('https://fredaccount.stlouisfed.org/apikeys')}
                    >
                        <Text style={styles.linkBtnText}>Get FRED key</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#F5C400" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C400" />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Macro</Text>
                    <Text style={styles.headerSub}>US economic indicators · FRED</Text>
                </View>

                <View style={styles.grid}>
                    {series.length === 0
                        ? FRED_SERIES.map((s) => (
                            <View key={s.id} style={[styles.card, { opacity: 0.5 }]}>
                                <Text style={styles.cardEmoji}>{s.emoji}</Text>
                                <Text style={styles.cardTitle}>{s.title}</Text>
                                <Text style={styles.cardValue}>—</Text>
                            </View>
                        ))
                        : series.map((s) => <MacroCard key={s.id} s={s} />)}
                </View>

                <Text style={styles.footer}>
                    Source: FRED · Federal Reserve Bank of St. Louis
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    loader: { flex: 1, backgroundColor: '#F5F5F3', alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: '#888', fontWeight: '600', marginTop: 4 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 16,
    },
    card: {
        width: '47%',
        flexGrow: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardEmoji: { fontSize: 22 },
    cardTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
    cardId: { fontSize: 10, color: '#bbb', fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
    cardValue: { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },
    chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    changeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    changeText: { fontSize: 11, fontWeight: '800' },
    cardDate: { fontSize: 10, color: '#bbb', fontWeight: '600' },
    spark: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 36,
        marginTop: 4,
    },
    footer: {
        textAlign: 'center',
        fontSize: 11,
        color: '#bbb',
        fontWeight: '600',
        paddingVertical: 32,
    },
    emptyBox: {
        margin: 20,
        padding: 32,
        backgroundColor: '#fff',
        borderRadius: 20,
        alignItems: 'center',
        gap: 10,
    },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginTop: 8 },
    emptyText: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19 },
    linkBtn: {
        marginTop: 12,
        backgroundColor: '#F5C400',
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    linkBtnText: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
});
