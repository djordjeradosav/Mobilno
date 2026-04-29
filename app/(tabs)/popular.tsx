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

    const fetchTrades = useCallback(async () => {
        if (!user?.id) return;
        try {
            // 1. Fetch trades only (avoiding relationship errors)
            const { data: tradesData, error: tradesError } = await supabase
                .from('trades')
                .select('*')
                .eq('user_id', user.id)
                .order('trade_date', { ascending: false });

            if (tradesError) {
                console.error('[fetchTrades] Trades Fetch Error:', tradesError.message);
                if (tradesError.message.includes('column "trade_date" does not exist')) {
                    console.warn('The "trade_date" column is missing. Please run the repair_trades.sql script.');
                }
                setLoading(false);
                return;
            }

            // 2. Fetch user profile separately
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('username, avatar_url, is_verified')
                .eq('id', user.id)
                .maybeSingle(); // Use maybeSingle to avoid errors if user not found yet

            if (userError) {
                console.warn('[fetchTrades] User Fetch Error:', userError.message);
            }

            // 3. Manually join the data
            if (tradesData) {
                const combinedTrades = tradesData.map(t => ({
                    ...t,
                    users: userData || { username: 'Trader', avatar_url: null, is_verified: false }
                }));
                setTrades(combinedTrades as Trade[]);
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

    // Calendar logic
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const calendarData = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const days = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);
        
        const grid = [];
        // Empty cells for first week
        for (let i = 0; i < firstDay; i++) {
            grid.push({ day: null });
        }
        
        // Actual days
        for (let d = 1; d <= days; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayTrades = trades.filter(t => t.trade_date === dateStr);
            const totalPL = dayTrades.reduce((sum, t) => sum + (t.money_value || 0), 0);
            
            grid.push({
                day: d,
                date: dateStr,
                trades: dayTrades.length,
                pl: totalPL
            });
        }
        
        return grid;
    }, [currentMonth, trades]);

    // Weekly P/L
    const weeklyPL = useMemo(() => {
        const weeks = [];
        let currentWeekPL = 0;
        
        calendarData.forEach((day, index) => {
            if (day.day) {
                currentWeekPL += day.pl || 0;
            }
            if ((index + 1) % 7 === 0 || index === calendarData.length - 1) {
                weeks.push(currentWeekPL);
                currentWeekPL = 0;
            }
        });
        return weeks;
    }, [calendarData]);

    // Monthly Totals
    const monthlyPL = useMemo(() => trades.reduce((sum, t) => sum + (t.money_value || 0), 0), [trades]);
    const totalTrades = trades.length;

    // Cumulative Data for Chart
    const chartData = useMemo(() => {
        let cumulative = 0;
        const sortedTrades = [...trades].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
        return sortedTrades.map(t => {
            cumulative += (t.money_value || 0);
            return cumulative;
        });
    }, [trades]);

    const filteredTrades = useMemo(() => {
        return trades.filter(t => t.trade_date === selectedDate);
    }, [trades, selectedDate]);

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <ScrollView 
                style={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C400" />}
            >
                <View style={styles.header}>
                    <Text style={styles.monthTitle}>
                        {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
                            <MaterialIcons name="chevron-left" size={28} color="#1a1a1a" />
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
                        <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
                            <MaterialIcons name="chevron-right" size={28} color="#1a1a1a" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Custom Calendar Grid */}
                <View style={styles.calendarContainer}>
                    <View style={styles.weekLabels}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'P&L'].map(d => (
                            <Text key={d} style={styles.weekLabel}>{d}</Text>
                        ))}
                    </View>
                    
                    <View style={styles.grid}>
                        {calendarData.map((item, i) => (
                            <TouchableOpacity 
                                key={i} 
                                style={[
                                    styles.dayCell,
                                    item.date === selectedDate && styles.selectedCell,
                                    item.day && item.pl > 0 && styles.profitCell,
                                    item.day && item.pl < 0 && styles.lossCell,
                                ]}
                                disabled={!item.day}
                                onPress={() => setSelectedDate(item.date!)}
                            >
                                {item.day && (
                                    <>
                                        <Text style={styles.dayNum}>{item.day}</Text>
                                        {item.trades > 0 && (
                                            <>
                                                <Text style={[styles.cellPL, { color: (item.pl || 0) >= 0 ? '#059669' : '#dc2626' }]}>
                                                    ${Math.abs(item.pl || 0).toFixed(0)}
                                                </Text>
                                                <Text style={styles.cellTrades}>{item.trades} trade{item.trades > 1 ? 's' : ''}</Text>
                                            </>
                                        )}
                                    </>
                                )}
                            </TouchableOpacity>
                        ))}
                        
                        {/* Weekly P/L column is handled by the grid layout */}
                    </View>
                </View>

                {/* Summary Footer */}
                <View style={styles.summary}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Monthly P&L</Text>
                        <Text style={[styles.summaryVal, { color: monthlyPL >= 0 ? '#059669' : '#dc2626' }]}>
                            {monthlyPL >= 0 ? '+' : '-'}${Math.abs(monthlyPL).toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Trades</Text>
                        <Text style={styles.summaryVal}>{totalTrades}</Text>
                    </View>
                </View>

                {/* Chart Section */}
                {chartData.length > 1 && (
                    <View style={styles.chartSection}>
                        <Text style={styles.sectionTitle}>Cumulative Performance</Text>
                        <View style={styles.chartWrap}>
                            <Svg height="150" width={SCREEN_WIDTH - 40}>
                                {chartData.map((val, i) => {
                                    if (i === 0) return null;
                                    const prev = chartData[i-1];
                                    const max = Math.max(...chartData, 1);
                                    const min = Math.min(...chartData, -1);
                                    const range = max - min;
                                    
                                    const x1 = ((i-1) / (chartData.length - 1)) * (SCREEN_WIDTH - 40);
                                    const x2 = (i / (chartData.length - 1)) * (SCREEN_WIDTH - 40);
                                    const y1 = 150 - ((prev - min) / range) * 150;
                                    const y2 = 150 - ((val - min) / range) * 150;
                                    
                                    return (
                                        <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#F5C400" strokeWidth="3" />
                                    );
                                })}
                            </Svg>
                        </View>
                    </View>
                )}

                {/* Selected Date Trades */}
                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Trades on {new Date(selectedDate).toLocaleDateString()}</Text>
                    {filteredTrades.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No trades recorded for this day.</Text>
                        </View>
                    ) : (
                        filteredTrades.map(trade => (
                            <TouchableOpacity 
                                key={trade.id} 
                                style={styles.historyItem}
                                onPress={() => { setSelectedTrade(trade); setModalVisible(true); }}
                            >
                                <View style={styles.historyMain}>
                                    <Text style={styles.historySymbol}>{trade.symbol}</Text>
                                    <View style={[styles.typeTag, { backgroundColor: trade.trade_type === 'Buy' ? '#EBF8FF' : '#FFF5F5' }]}>
                                        <Text style={[styles.typeTagText, { color: trade.trade_type === 'Buy' ? '#3182CE' : '#E53E3E' }]}>
                                            {trade.trade_type}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.historyPrices}>
                                    <Text style={styles.priceLabel}>Entry: ${trade.entry_price || '0.00'}</Text>
                                    <Text style={styles.priceLabel}>Exit: ${trade.exit_price || '0.00'}</Text>
                                </View>
                                <Text style={[styles.historyPL, { color: trade.money_value >= 0 ? '#059669' : '#dc2626' }]}>
                                    {trade.money_value >= 0 ? '+' : '-'}${Math.abs(trade.money_value).toFixed(2)}
                                </Text>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            <TradeDetailsModal 
                visible={modalVisible}
                forecast={selectedTrade}
                onClose={() => setModalVisible(false)}
                onLike={() => {}}
                isLiked={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    scroll: { flex: 1 },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    monthTitle: { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    todayBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    todayText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    calendarContainer: { paddingHorizontal: 10 },
    weekLabels: { flexDirection: 'row', marginBottom: 10 },
    weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#999' },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { 
        width: (SCREEN_WIDTH - 20) / 8, 
        height: 80, 
        borderWidth: 0.5, 
        borderColor: '#f0f0f0', 
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    selectedCell: { borderColor: '#3b82f6', borderWidth: 2, borderRadius: 8 },
    profitCell: { backgroundColor: '#ecfdf5' },
    lossCell: { backgroundColor: '#fef2f2' },
    dayNum: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', position: 'absolute', top: 4, left: 4 },
    cellPL: { fontSize: 11, fontWeight: '800', marginTop: 10 },
    cellTrades: { fontSize: 9, color: '#666', fontWeight: '500' },
    summary: { 
        flexDirection: 'row', 
        backgroundColor: '#ecfdf5', 
        margin: 20, 
        padding: 20, 
        borderRadius: 16,
        justifyContent: 'space-between'
    },
    summaryItem: { gap: 4 },
    summaryLabel: { fontSize: 13, fontWeight: '700', color: '#065f46' },
    summaryVal: { fontSize: 20, fontWeight: '900' },
    chartSection: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1a1a1a', marginBottom: 16 },
    chartWrap: { height: 150, backgroundColor: '#fafafa', borderRadius: 16, justifyContent: 'center' },
    historySection: { padding: 20, paddingBottom: 100 },
    historyItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#f5f5f5' 
    },
    historyMain: { flex: 1, gap: 4 },
    historySymbol: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
    typeTag: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    typeTagText: { fontSize: 10, fontWeight: '800' },
    historyPrices: { flex: 1, gap: 2 },
    priceLabel: { fontSize: 11, color: '#999', fontWeight: '600' },
    historyPL: { fontSize: 16, fontWeight: '900' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#999', fontWeight: '600' }
});
