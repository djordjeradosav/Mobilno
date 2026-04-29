import { FredSeries, formatFredValue, getAllFredSeries, FredObservation } from '@/lib/fred';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

function DashboardChart({ observations, unit }: { observations: FredObservation[], unit: string }) {
    const data = useMemo(() => [...observations].reverse(), [observations]);
    if (data.length === 0) return null;

    const chartWidth = SCREEN_W - 72;
    const chartHeight = 180;
    const padding = 25;
    
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const barWidth = (chartWidth - padding * 2) / data.length - 4;

    return (
        <View style={styles.chartWrapper}>
            <Svg width={chartWidth} height={chartHeight + 30}>
                {/* Y-Axis Grid Lines */}
                {[0, 0.5, 1].map((p, i) => {
                    const y = padding + (1 - p) * (chartHeight - padding * 2);
                    const val = min + p * range;
                    return (
                        <G key={i}>
                            <Line 
                                x1={padding} y1={y} x2={chartWidth - padding} y2={y} 
                                stroke="#eee" strokeWidth="1" strokeDasharray="4,4" 
                            />
                            <SvgText 
                                x={padding - 5} y={y + 4} 
                                fontSize="9" fill="#999" textAnchor="end" fontWeight="600"
                            >
                                {formatFredValue(val, unit)}
                            </SvgText>
                        </G>
                    );
                })}

                {/* Bars */}
                {data.map((d, i) => {
                    const h = ((d.value - min) / range) * (chartHeight - padding * 2);
                    const x = padding + i * (barWidth + 4);
                    const y = chartHeight - padding - h;
                    
                    return (
                        <Rect
                            key={i}
                            x={x}
                            y={y}
                            width={barWidth}
                            height={h + 2} // Small base height
                            fill="#F5C400"
                            rx={2}
                            opacity={0.8}
                        />
                    );
                })}
                
                {/* X-Axis Labels (First and Last) */}
                <SvgText x={padding} y={chartHeight - 5} fontSize="10" fill="#bbb" fontWeight="600">
                    {new Date(data[0].date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                </SvgText>
                <SvgText x={chartWidth - padding} y={chartHeight - 5} fontSize="10" fill="#bbb" textAnchor="end" fontWeight="600">
                    {new Date(data[data.length - 1].date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                </SvgText>
            </Svg>
        </View>
    );
}

export default function Macro() {
    const [series, setSeries] = useState<FredSeries[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

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

    const activeSeries = series[activeIndex];

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
                    <Text style={styles.headerTitle}>Macro Dashboard</Text>
                    <Text style={styles.headerSub}>US Economic Indicators</Text>
                </View>
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                    <MaterialIcons name="refresh" size={20} color="#1a1a1a" />
                </TouchableOpacity>
            </View>

            {/* Indicator Tabs */}
            <View style={styles.tabsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                    {series.map((s, i) => (
                        <TouchableOpacity 
                            key={s.id} 
                            style={[styles.tab, activeIndex === i && styles.tabActive]}
                            onPress={() => setActiveIndex(i)}
                        >
                            <Text style={[styles.tabText, activeIndex === i && styles.tabTextActive]}>
                                {s.title.split(' (')[0]}
                            </Text>
                            {activeIndex === i && <View style={styles.tabIndicator} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C400" />}
            >
                {activeSeries && (
                    <View style={styles.content}>
                        <View style={styles.titleSection}>
                            <Text style={styles.seriesTitle}>{activeSeries.title}</Text>
                            <Text style={styles.seriesSub}>Monthly data • {activeSeries.unit}</Text>
                        </View>

                        {/* Metric Cards */}
                        <View style={styles.cardsGrid}>
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>Latest Release</Text>
                                <Text style={styles.cardValue}>
                                    {activeSeries.latest ? formatFredValue(activeSeries.latest.value, activeSeries.unit) : '—'}
                                </Text>
                                <Text style={styles.cardDate}>
                                    {activeSeries.latest ? new Date(activeSeries.latest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                </Text>
                            </View>
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>Previous</Text>
                                <Text style={styles.cardValue}>
                                    {activeSeries.previous ? formatFredValue(activeSeries.previous.value, activeSeries.unit) : '—'}
                                </Text>
                                <Text style={styles.cardDate}>
                                    {activeSeries.previous ? new Date(activeSeries.previous.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                </Text>
                            </View>
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>Change</Text>
                                <View style={styles.changeRow}>
                                    {activeSeries.changePct !== null && (
                                        <FontAwesome5 
                                            name={activeSeries.changePct >= 0 ? "caret-up" : "caret-down"} 
                                            size={16} 
                                            color={activeSeries.changePct >= 0 ? "#059669" : "#dc2626"} 
                                        />
                                    )}
                                    <Text style={[styles.cardValue, { color: (activeSeries.changePct || 0) >= 0 ? "#059669" : "#dc2626", marginLeft: 4 }]}>
                                        {activeSeries.changePct !== null ? `${activeSeries.changePct.toFixed(2)}%` : '—'}
                                    </Text>
                                </View>
                                <Text style={styles.cardDate}>vs previous month</Text>
                            </View>
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>Status</Text>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>ACTIVE</Text>
                                </View>
                                <Text style={styles.cardDate}>Updated regularly</Text>
                            </View>
                        </View>

                        {/* Chart Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Historical Trend</Text>
                                <View style={styles.periodBadges}>
                                    <View style={[styles.periodBadge, styles.periodBadgeActive]}><Text style={styles.periodTextActive}>2Y</Text></View>
                                </View>
                            </View>
                            <DashboardChart observations={activeSeries.observations} unit={activeSeries.unit} />
                        </View>

                        {/* Release History */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Release History</Text>
                            <View style={styles.historyTable}>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.th, { textAlign: 'left' }]}>Date</Text>
                                    <Text style={styles.th}>Value</Text>
                                    <Text style={styles.th}>Change</Text>
                                </View>
                                {activeSeries.observations.slice(0, 10).map((obs, idx) => {
                                    const prev = activeSeries.observations[idx + 1];
                                    const change = prev ? ((obs.value - prev.value) / prev.value) * 100 : null;
                                    return (
                                        <View key={obs.date} style={styles.tableRow}>
                                            <Text style={[styles.td, { textAlign: 'left', color: '#1a1a1a' }]}>
                                                {new Date(obs.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </Text>
                                            <Text style={[styles.td, { fontWeight: '800', color: '#1a1a1a' }]}>
                                                {formatFredValue(obs.value, activeSeries.unit)}
                                            </Text>
                                            <Text style={[styles.td, { color: (change || 0) >= 0 ? "#059669" : "#dc2626" }]}>
                                                {change !== null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '—'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Data source: Federal Reserve Bank of St. Louis (FRED)</Text>
                    <Text style={styles.footerText}>Updated: {new Date().toLocaleString()}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F3' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
    headerSub: { fontSize: 13, color: '#999', fontWeight: '500', marginTop: 2 },
    refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5C400', alignItems: 'center', justifyContent: 'center' },
    tabsContainer: { backgroundColor: '#F5F5F3', paddingBottom: 8 },
    tabsScroll: { paddingHorizontal: 20, gap: 20 },
    tab: { paddingVertical: 8, position: 'relative' },
    tabActive: {},
    tabText: { fontSize: 14, fontWeight: '700', color: '#888' },
    tabTextActive: { color: '#1a1a1a' },
    tabIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#F5C400', borderRadius: 2 },
    scroll: { flex: 1 },
    content: { padding: 20 },
    titleSection: { marginBottom: 20 },
    seriesTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
    seriesSub: { fontSize: 13, color: '#999', fontWeight: '600', marginTop: 4 },
    cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    card: { width: (SCREEN_W - 52) / 2, backgroundColor: '#fff', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    cardLabel: { fontSize: 11, fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: 8 },
    cardValue: { fontSize: 18, fontWeight: '900', color: '#1a1a1a' },
    cardDate: { fontSize: 11, color: '#bbb', fontWeight: '600', marginTop: 4 },
    changeRow: { flexDirection: 'row', alignItems: 'center' },
    statusBadge: { alignSelf: 'flex-start', backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '800', color: '#059669' },
    section: { backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
    periodBadges: { flexDirection: 'row', gap: 8 },
    periodBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#f5f5f5' },
    periodBadgeActive: { backgroundColor: '#1a1a1a' },
    periodTextActive: { fontSize: 11, fontWeight: '800', color: '#fff' },
    chartWrapper: { alignItems: 'center', marginTop: 10 },
    historyTable: { marginTop: 12 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10, marginBottom: 10 },
    th: { flex: 1, fontSize: 11, fontWeight: '800', color: '#999', textTransform: 'uppercase', textAlign: 'right' },
    tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
    td: { flex: 1, fontSize: 13, fontWeight: '600', color: '#666', textAlign: 'right' },
    footer: { paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center' },
    footerText: { fontSize: 11, color: '#aaa', fontWeight: '500', marginBottom: 4, textAlign: 'center' },
});
