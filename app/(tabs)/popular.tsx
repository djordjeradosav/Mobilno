import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path, Rect, Line, Polyline } from 'react-native-svg';
import { Trade } from '@/components/ForecastCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Popular() {
    const { user } = useAuth();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    interface CalendarItem {
        day: number | null;
        date?: string;
        trades?: number;
        pl?: number;
        isWeekTotal: boolean;
    }

    const fetchTrades = useCallback(async () => {
        if (!user?.id) return;
        try {
            // Fetch only from 'trades' table (which now includes forecasts)
            const tradesRes = await supabase
                .from('trades')
                .select('*')
                .eq('user_id', user.id)
                .order('trade_date', { ascending: false });

            if (tradesRes.error) {
                console.error('[fetchTrades] Trades Fetch Error:', tradesRes.error.message);
            }

            const allTrades = tradesRes.data || [];

            if (allTrades.length > 0) {
                const userIds = [...new Set(allTrades.map(t => t.user_id))];
                const { data: usersData } = await supabase
                    .from('users')
                    .select('id, username, avatar_url, is_verified')
                    .in('id', userIds);

                const userMap = (usersData || []).reduce((acc: any, u) => {
                    acc[u.id] = { username: u.username, avatar_url: u.avatar_url, is_verified: u.is_verified };
                    return acc;
                }, {});

                const combinedTrades = allTrades.map(t => ({
                    ...t,
                    // Ensure trade_date is in YYYY-MM-DD format for calendar
                    trade_date: t.trade_date ? (typeof t.trade_date === 'string' ? t.trade_date.split('T')[0] : t.trade_date) : new Date().toISOString().split('T')[0],
                    users: userMap[t.user_id] || { username: 'Trader', avatar_url: null, is_verified: false }
                }));
                setTrades(combinedTrades as Trade[]);
            } else {
                setTrades([]);
            }
        } catch (err) {
            console.error('[fetchTrades] Unexpected Error:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            fetchTrades();
        }, [fetchTrades])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTrades();
        setRefreshing(false);
    }, [fetchTrades]);

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const calendarGrid = useMemo<CalendarItem[]>(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const days = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);
        
        const grid: CalendarItem[] = [];
        for (let i = 0; i < firstDay; i++) {
            grid.push({ day: null, isWeekTotal: false });
        }
        
        for (let d = 1; d <= days; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            // Filter trades by date, ensuring we handle potential time components in trade_date
            const dayTrades = trades.filter(t => {
                if (!t.trade_date) return false;
                // Normalize trade_date to YYYY-MM-DD format
                const tDate = typeof t.trade_date === 'string' ? t.trade_date.split('T')[0] : t.trade_date;
                return tDate === dateStr;
            });
            const totalPL = dayTrades.reduce((sum, t) => sum + (t.money_value || 0), 0);
            
            grid.push({
                day: d,
                date: dateStr,
                trades: dayTrades.length,
                pl: totalPL,
                isWeekTotal: false
            });
        }

        while (grid.length % 7 !== 0) {
            grid.push({ day: null, isWeekTotal: false });
        }

        const finalGrid: CalendarItem[] = [];
        for (let i = 0; i < grid.length; i += 7) {
            const week = grid.slice(i, i + 7);
            const weekTotal = week.reduce((sum, item) => sum + (item.pl || 0), 0);
            finalGrid.push(...week);
            finalGrid.push({ day: null, pl: weekTotal, isWeekTotal: true });
        }
        
        return finalGrid;
    }, [currentMonth, trades]);

    const monthlyTrades = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        return trades.filter(t => {
            if (!t.trade_date) return false;
            const tDate = typeof t.trade_date === 'string' ? t.trade_date.split('T')[0] : t.trade_date;
            return tDate.startsWith(monthStr);
        });
    }, [trades, currentMonth]);

    const monthlyPL = useMemo(() => monthlyTrades.reduce((sum, t) => sum + (t.money_value || 0), 0), [monthlyTrades]);
    const totalTrades = monthlyTrades.length;

    const chartData = useMemo(() => {
        let cumulative = 0;
        const sortedTrades = [...trades].sort((a, b) => {
            const dateA = new Date(typeof a.trade_date === 'string' ? a.trade_date : new Date().toISOString()).getTime();
            const dateB = new Date(typeof b.trade_date === 'string' ? b.trade_date : new Date().toISOString()).getTime();
            return dateA - dateB;
        });
        return sortedTrades.map(t => {
            cumulative += (t.money_value || 0);
            return cumulative;
        });
    }, [trades]);

    const filteredTrades = useMemo(() => {
        return trades.filter(t => {
            if (!t.trade_date) return false;
            const tDate = typeof t.trade_date === 'string' ? t.trade_date.split('T')[0] : t.trade_date;
            return tDate === selectedDate;
        });
    }, [trades, selectedDate]);

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
                    <Text style={styles.headerTitle}>Trading Calendar</Text>
                    <Text style={styles.headerSub}>{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
                        <MaterialIcons name="chevron-left" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.todayBtn}
                        onPress={() => {
                            const today = new Date();
                            setCurrentMonth(today);
                            setSelectedDate(today.toISOString().split('T')[0]);
                        }}
                    >
                        <Text style={styles.todayText}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
                        <MaterialIcons name="chevron-right" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView 
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C400" />}
            >
                <View style={styles.calendarContainer}>
                    <View style={styles.weekLabels}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S', 'P&L'].map((d, i) => (
                            <Text key={i} style={styles.weekLabel}>{d}</Text>
                        ))}
                    </View>
                    
                    <View style={styles.grid}>
                        {calendarGrid.map((item: CalendarItem, i) => {
                            // Ensure pl is always a number for calculations
                            const safePL = item.pl || 0;
                            const safeTrades = item.trades || 0;

                            if (item.isWeekTotal) {
                                return (
                                    <View key={`week-${i}`} style={[styles.dayCell, styles.weekTotalCell]}>
                                        <Text style={[styles.cellPL, { color: safePL >= 0 ? '#059669' : '#dc2626' }]}>
                                            ${Math.abs(safePL).toFixed(0)}
                                        </Text>
                                    </View>
                                );
                            }
                            
                            const isSelected = !!(item.date && item.date === selectedDate);
                            const isProfit = item.day !== null && safePL > 0;
                            const isLoss = item.day !== null && safePL < 0;

                            return (
                                <TouchableOpacity 
                                    key={i} 
                                    style={[
                                        styles.dayCell,
                                        isSelected && styles.selectedCell,
                                        isProfit && styles.profitCell,
                                        isLoss && styles.lossCell,
                                    ]}
                                    disabled={!item.day}
                                    onPress={() => item.date && setSelectedDate(item.date)}
                                >
                                    {item.day && (
                                        <>
                                            <Text style={styles.dayNum}>{item.day}</Text>
                                            {safeTrades > 0 && (
                                                <Text style={[styles.miniPL, { color: safePL >= 0 ? '#059669' : '#dc2626' }]}>
                                                    ${Math.abs(safePL).toFixed(0)}
                                                </Text>
                                            )}
                                        </>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.cardsGrid}>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Monthly P&L</Text>
                        <Text style={[styles.cardValue, { color: monthlyPL >= 0 ? '#059669' : '#dc2626' }]}>
                            {monthlyPL >= 0 ? '+' : '-'}${Math.abs(monthlyPL).toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.cardLabel}>Total Trades</Text>
                        <Text style={styles.cardValue}>{totalTrades}</Text>
                    </View>
                </View>

                {chartData.length > 1 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Performance Trend</Text>
                        <View style={styles.chartWrapper}>
                            <Svg height="120" width={SCREEN_WIDTH - 40}>
                                {chartData.map((val, i) => {
                                    if (i === 0) return null;
                                    const prev = chartData[i - 1];
                                    const max = Math.max(...chartData, 1);
                                    const min = Math.min(...chartData, -1);
                                    const range = max === min ? 1 : max - min;
                                    const x1 = ((i - 1) / (chartData.length - 1)) * (SCREEN_WIDTH - 40);
                                    const x2 = (i / (chartData.length - 1)) * (SCREEN_WIDTH - 40);
                                    const y1 = 120 - ((prev - min) / range) * 120;
                                    const y2 = 120 - ((val - min) / range) * 120;
                                    return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F5C400" strokeWidth="3" />;
                                })}
                            </Svg>
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Trades on {new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                    {filteredTrades.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No trades for this day.</Text>
                        </View>
                    ) : (
                        <View style={styles.historyTable}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.th, { textAlign: 'left' }]}>Symbol</Text>
                                <Text style={styles.th}>Type</Text>
                                <Text style={[styles.th, { textAlign: 'right' }]}>P&L</Text>
                            </View>
                            {filteredTrades.map(trade => (
                                <TouchableOpacity 
                                    key={trade.id} 
                                    style={styles.tableRow}
                                    onPress={() => { setSelectedTrade(trade); setModalVisible(true); }}
                                >
                                    <Text style={[styles.td, { textAlign: 'left', fontWeight: '800' }]}>{trade.symbol}</Text>
                                    <Text style={[styles.td, { color: trade.trade_type === 'Buy' ? '#3182CE' : '#E53E3E', fontWeight: '700' }]}>
                                        {trade.trade_type}
                                    </Text>
                                    <Text style={[styles.td, { textAlign: 'right', fontWeight: '800', color: trade.money_value >= 0 ? '#059669' : '#dc2626' }]}>
                                        {trade.money_value >= 0 ? '+' : '-'}${Math.abs(trade.money_value).toFixed(2)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            <TradeDetailsModal 
                visible={modalVisible}
                forecast={selectedTrade}
                onClose={() => setModalVisible(false)}
                onLike={() => {}}
                isLiked={false}
                currentUserId={user?.id}
                onUpdate={fetchTrades}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#1a1a1a' },
    headerSub: { fontSize: 14, color: '#999', fontWeight: '600', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    todayBtn: { backgroundColor: '#F5C400', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    todayText: { color: '#1a1a1a', fontWeight: '800', fontSize: 12 },
    scroll: { flex: 1 },
    calendarContainer: { padding: 15 },
    weekLabels: { flexDirection: 'row', marginBottom: 10 },
    weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', color: '#bbb' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
    dayCell: { 
        width: (SCREEN_WIDTH - 32) / 8, 
        height: 55, 
        borderWidth: 0.5, 
        borderColor: '#f5f5f5', 
        alignItems: 'center',
        justifyContent: 'center'
    },
    weekTotalCell: { backgroundColor: '#fafafa' },
    selectedCell: { backgroundColor: '#F5C400', borderColor: '#F5C400' },
    profitCell: { backgroundColor: '#ecfdf5' },
    lossCell: { backgroundColor: '#fef2f2' },
    dayNum: { fontSize: 11, fontWeight: '700', color: '#1a1a1a', position: 'absolute', top: 5, left: 5 },
    miniPL: { fontSize: 10, fontWeight: '800', marginTop: 15 },
    cellPL: { fontSize: 11, fontWeight: '900' },
    cardsGrid: { flexDirection: 'row', padding: 20, gap: 15 },
    card: { flex: 1, backgroundColor: '#f9fafb', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#f0f0f0' },
    cardLabel: { fontSize: 12, color: '#999', fontWeight: '700', marginBottom: 4 },
    cardValue: { fontSize: 18, fontWeight: '900', color: '#1a1a1a' },
    section: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1a1a1a', marginBottom: 15 },
    chartWrapper: { backgroundColor: '#f9fafb', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#f0f0f0' },
    historyTable: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#f9fafb', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    th: { flex: 1, fontSize: 11, fontWeight: '800', color: '#999', textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
    td: { flex: 1, fontSize: 14, color: '#1a1a1a' },
    emptyState: { padding: 40, alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 16 },
    emptyText: { color: '#999', fontWeight: '700' }
});
