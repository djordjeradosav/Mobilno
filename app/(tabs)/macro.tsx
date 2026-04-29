import { FredSeries, formatFredValue, getAllFredSeries, hasFredKey } from '@/lib/fred';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

function SimpleChart({ observations }: { observations: { value: number }[] }) {
    const values = observations.map(o => o.value).reverse();
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return (
        <View style={styles.chartContainer}>
            {values.map((v, i) => {
                const h = ((v - min) / range) * 40 + 5;
                return (
                    <View
                        key={i}
                        style={[
                            styles.bar,
                            { height: h, opacity: 0.3 + (i / values.length) * 0.7 }
                        ]}
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

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#F5C400" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Macro Data</Text>
                    <Text style={styles.headerSub}>US Economic Indicators (FRED API)</Text>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                    <MaterialIcons name="refresh" size={20} color="#1a1a1a" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C400" />}
            >
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.th, { flex: 2, textAlign: 'left' }]}>Indicator</Text>
                        <Text style={styles.th}>Previous</Text>
                        <Text style={styles.th}>Current</Text>
                        <Text style={[styles.th, { textAlign: 'center' }]}>Trend</Text>
                    </View>

                    {series.map((s) => (
                        <View key={s.id} style={styles.tr}>
                            <View style={[styles.td, { flex: 2, textAlign: 'left', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }]}>
                                <Text style={styles.indicatorEmoji}>{s.emoji}</Text>
                                <View>
                                    <Text style={styles.indicatorTitle}>{s.title}</Text>
                                    <Text style={styles.indicatorId}>{s.id}</Text>
                                </View>
                            </View>
                            <Text style={styles.td}>
                                {s.previous ? formatFredValue(s.previous.value, s.unit) : '—'}
                            </Text>
                            <Text style={[styles.td, styles.currentValue]}>
                                {s.latest ? formatFredValue(s.latest.value, s.unit) : '—'}
                            </Text>
                            <View style={[styles.td, { justifyContent: 'center' }]}>
                                <SimpleChart observations={s.observations.slice(0, 12)} />
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Data source: Federal Reserve Bank of St. Louis (FRED)</Text>
                    <Text style={styles.footerText}>Last updated: {new Date().toLocaleString()}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F3' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#F5F5F3' },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: '#999', fontWeight: '500', marginTop: 4 },
    refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5C400', alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    table: { backgroundColor: '#fff', marginTop: 16, marginHorizontal: 16, marginBottom: 24, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f9f9f9', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    th: { flex: 1, fontSize: 11, fontWeight: '800', color: '#999', textTransform: 'uppercase', textAlign: 'right', letterSpacing: 0.5 },
    tr: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f8f8f8', alignItems: 'center' },
    td: { flex: 1, fontSize: 13, fontWeight: '700', color: '#555', textAlign: 'right' },
    indicatorEmoji: { fontSize: 18, marginRight: 8 },
    indicatorTitle: { fontSize: 13, fontWeight: '800', color: '#1a1a1a' },
    indicatorId: { fontSize: 10, color: '#bbb', fontWeight: '600' },
    currentValue: { color: '#1a1a1a', fontWeight: '900' },
    chartContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 50, width: 70 },
    bar: { width: 4, backgroundColor: '#F5C400', borderRadius: 2 },
    footer: { paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center' },
    footerText: { fontSize: 12, color: '#aaa', fontWeight: '500', marginBottom: 6, textAlign: 'center' },
});