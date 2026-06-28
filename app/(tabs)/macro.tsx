import { FredSeries, formatFredValue, getAllFredSeries, FredObservation } from '@/lib/fred';
import { MaterialIcons } from '@expo/vector-icons';
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
import Svg, { Rect, Line, Text as SvgText, G, Polyline, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/components/ThemeContext';
import Colors from '@/constants/Colors';

const { width: SCREEN_W } = Dimensions.get('window');

function AreaChart({ observations, unit, C }: { observations: FredObservation[], unit: string, C: any }) {
    const data = useMemo(() => [...observations].reverse(), [observations]);
    if (data.length === 0) return null;

    const chartW = SCREEN_W - 72;
    const chartH = 120;
    const padL = 36;
    const padB = 20;

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const xStep = (chartW - padL) / (data.length - 1);
    const points = data.map((d, i) => {
        const x = padL + i * xStep;
        const y = chartH - padB - ((d.value - min) / range) * (chartH - padB - 10);
        return `${x},${y}`;
    }).join(' ');

    const areaPoints = `${padL},${chartH - padB} ${points} ${padL + (data.length - 1) * xStep},${chartH - padB}`;

    return (
        <Svg width={chartW} height={chartH + 10}>
            <Defs>
                <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={C.accent} stopOpacity="0.3" />
                    <Stop offset="100%" stopColor={C.accent} stopOpacity="0" />
                </LinearGradient>
            </Defs>

            {[0, 0.5, 1].map((p, i) => {
                const y = chartH - padB - p * (chartH - padB - 10);
                const val = min + p * range;
                return (
                    <G key={i}>
                        <Line
                            x1={padL} y1={y} x2={chartW} y2={y}
                            stroke={C.accent} strokeWidth="1" strokeOpacity="0.1"
                        />
                        <SvgText
                            x={padL - 4} y={y + 4}
                            fontSize="8" fill={C.textMuted}
                            textAnchor="end" fontWeight="600"
                        >
                            {formatFredValue(val, unit)}
                        </SvgText>
                    </G>
                );
            })}

            <Polyline points={areaPoints} fill="url(#areaGrad)" stroke="none" />
            <Polyline
                points={points}
                fill="none"
                stroke={C.accent}
                strokeWidth="2"
            />
        </Svg>
    );
}

export default function Macro() {
    const { colorScheme } = useTheme();
    const C = Colors[colorScheme];

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
            <View style={[styles.loader, { backgroundColor: C.background }]}>
                <ActivityIndicator size="large" color={C.accent} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: C.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: C.text }]}>Macro</Text>
                    <Text style={[styles.headerSub, { color: C.textMuted }]}>US Economic Indicators</Text>
                </View>
                <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={onRefresh}>
                    <MaterialIcons name="refresh" size={18} color={C.accent} />
                </TouchableOpacity>
            </View>

            <View style={[styles.dividerLine, { backgroundColor: C.border }]} />

            {/* Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsContainer}
                contentContainerStyle={styles.tabsScroll}
            >
                {series.map((s, i) => (
                    <TouchableOpacity
                        key={s.id}
                        style={[styles.tab, activeIndex === i && styles.tabActive]}
                        onPress={() => setActiveIndex(i)}
                    >
                        <Text style={[styles.tabText, { color: C.textMuted }, activeIndex === i && { color: C.text, fontWeight: '700' }]}>
                            {s.title.split(' (')[0]}
                        </Text>
                        {activeIndex === i && <View style={[styles.tabUnderline, { backgroundColor: C.accent }]} />}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={[styles.dividerLine, { backgroundColor: C.border }]} />

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={C.accent}
                        colors={[C.accent]}
                    />
                }
            >
                {activeSeries && (
                    <View style={styles.content}>
                        {/* Title */}
                        <View style={styles.titleSection}>
                            <Text style={[styles.seriesTitle, { color: C.text }]}>{activeSeries.title}</Text>
                            <Text style={[styles.seriesSub, { color: C.textMuted }]}>{activeSeries.unit}</Text>
                        </View>

                        {/* Key metrics */}
                        <View style={styles.metricsRow}>
                            <View style={[styles.metricCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                                <Text style={[styles.metricLabel, { color: C.textMuted }]}>Latest</Text>
                                <Text style={[styles.metricValue, { color: C.text }]}>
                                    {activeSeries.latest ? formatFredValue(activeSeries.latest.value, activeSeries.unit) : '—'}
                                </Text>
                                <Text style={[styles.metricDate, { color: C.textMuted }]}>
                                    {activeSeries.latest
                                        ? new Date(activeSeries.latest.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
                                        : ''}
                                </Text>
                            </View>
                            <View style={[styles.metricCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                                <Text style={[styles.metricLabel, { color: C.textMuted }]}>Previous</Text>
                                <Text style={[styles.metricValue, { color: C.text }]}>
                                    {activeSeries.previous ? formatFredValue(activeSeries.previous.value, activeSeries.unit) : '—'}
                                </Text>
                                <Text style={[styles.metricDate, { color: C.textMuted }]}>
                                    {activeSeries.previous
                                        ? new Date(activeSeries.previous.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
                                        : ''}
                                </Text>
                            </View>
                            <View style={[styles.metricCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                                <Text style={[styles.metricLabel, { color: C.textMuted }]}>Change</Text>
                                <View style={styles.changeRow}>
                                    {activeSeries.changePct !== null && (
                                        <Text style={[styles.metricValue, {
                                            color: (activeSeries.changePct || 0) >= 0 ? C.success : C.danger
                                        }]}>
                                            {(activeSeries.changePct || 0) >= 0 ? '▲' : '▼'} {Math.abs(activeSeries.changePct || 0).toFixed(2)}%
                                        </Text>
                                    )}
                                </View>
                                <Text style={[styles.metricDate, { color: C.textMuted }]}>vs prev</Text>
                            </View>
                        </View>

                        {/* Chart */}
                        <View style={[styles.chartCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                            <View style={styles.chartHeader}>
                                <Text style={[styles.chartTitle, { color: C.text }]}>Historical Trend</Text>
                                <View style={[styles.periodBadge, { backgroundColor: C.border }]}>
                                    <Text style={[styles.periodText, { color: C.textMuted }]}>2Y</Text>
                                </View>
                            </View>
                            <AreaChart observations={activeSeries.observations} unit={activeSeries.unit} C={C} />
                        </View>

                        {/* History table */}
                        <View style={[styles.tableCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                            <Text style={[styles.tableTitle, { color: C.text }]}>Release History</Text>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.th, { color: C.textMuted, textAlign: 'left', flex: 2 }]}>Date</Text>
                                <Text style={[styles.th, { color: C.textMuted }]}>Value</Text>
                                <Text style={[styles.th, { color: C.textMuted }]}>Change</Text>
                            </View>
                            <View style={[styles.tableDivider, { backgroundColor: C.border }]} />
                            {activeSeries.observations.slice(0, 10).map((obs, idx) => {
                                const prev = activeSeries.observations[idx + 1];
                                const change = prev ? ((obs.value - prev.value) / prev.value) * 100 : null;
                                const isPos = (change || 0) >= 0;
                                return (
                                    <View key={obs.date} style={[styles.tableRow, { borderBottomColor: C.border }]}>
                                        <Text style={[styles.td, { textAlign: 'left', flex: 2, color: C.textMuted }]}>
                                            {new Date(obs.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                                        </Text>
                                        <Text style={[styles.td, { fontWeight: '700', color: C.text }]}>
                                            {formatFredValue(obs.value, activeSeries.unit)}
                                        </Text>
                                        <Text style={[styles.td, { color: isPos ? C.success : C.danger }]}>
                                            {change !== null ? `${isPos ? '+' : ''}${change.toFixed(2)}%` : '—'}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        <Text style={[styles.footerText, { color: C.textMuted }]}>Data: Federal Reserve Bank of St. Louis (FRED)</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingHorizontal: 20, paddingVertical: 16,
    },
    headerTitle: { fontSize: 20, fontWeight: '900' },
    headerSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    refreshBtn: {
        width: 36, height: 36, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },
    dividerLine: { height: 1 },

    tabsContainer: { maxHeight: 48 },
    tabsScroll: { paddingHorizontal: 20, gap: 4 },
    tab: { paddingHorizontal: 12, paddingVertical: 12, position: 'relative' },
    tabActive: {},
    tabText: { fontSize: 13, fontWeight: '600' },
    tabUnderline: {
        position: 'absolute', bottom: 0, left: 12, right: 12,
        height: 2, borderRadius: 1,
    },

    scroll: { flex: 1 },
    content: { padding: 16, gap: 16 },

    titleSection: { paddingTop: 4 },
    seriesTitle: { fontSize: 16, fontWeight: '800' },
    seriesSub: { fontSize: 12, marginTop: 4 },

    metricsRow: { flexDirection: 'row', gap: 8 },
    metricCard: {
        flex: 1,
        borderRadius: 8,
        padding: 14,
        gap: 4,
        borderWidth: 1,
    },
    metricLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    metricValue: { fontSize: 15, fontWeight: '900' },
    metricDate: { fontSize: 10, fontWeight: '600' },
    changeRow: { flexDirection: 'row', alignItems: 'center' },

    chartCard: {
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    chartTitle: { fontSize: 13, fontWeight: '700' },
    periodBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    periodText: { fontSize: 10, fontWeight: '800' },

    tableCard: {
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
    },
    tableTitle: { fontSize: 13, fontWeight: '700', marginBottom: 14 },
    tableHeader: { flexDirection: 'row' },
    tableDivider: { height: 1, marginVertical: 8 },
    th: {
        flex: 1, fontSize: 10, fontWeight: '800',
        textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'right',
    },
    tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1 },
    td: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },

    footerText: {
        fontSize: 10, fontWeight: '500', textAlign: 'center', marginTop: 4, marginBottom: 16,
    },
});