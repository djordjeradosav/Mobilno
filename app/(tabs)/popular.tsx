import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
import { Forecast } from '@/components/ForecastCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Popular() {
    const { user } = useAuth();
    const [trades, setTrades] = useState<Forecast[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedTrade, setSelectedTrade] = useState<Forecast | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const fetchTrades = useCallback(async () => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('forecasts')
            .select('*, users!forecasts_user_id_fkey(username, avatar_url, is_verified)')
            .eq('user_id', user.id)
            .order('trade_date', { ascending: false });

        if (error) console.error('[fetchTrades]', error.message);
        if (data) setTrades(data as Forecast[]);
        setLoading(false);
    }, [user?.id]);

    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTrades();
        setRefreshing(false);
    }, [fetchTrades]);

    // Calendar Helper Functions
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const calendarData = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const numDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);
        
        const weeks = [];
        let currentWeek = Array(7).fill(null);
        
        for (let i = 0; i < startDay; i++) {
            currentWeek[i] = null;
        }
        
        for (let day = 1; day <= numDays; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTrades = trades.filter(t => (t.trade_date || t.created_at.split('T')[0]) === dateStr);
            const pl = dayTrades.reduce((sum, t) => sum + (t.money_value || 0), 0);
            
            const dayIdx = (startDay + day - 1) % 7;
            currentWeek[dayIdx] = { day, date: dateStr, trades: dayTrades, pl };
            
            if (dayIdx === 6 || day === numDays) {
                weeks.push(currentWeek);
                currentWeek = Array(7).fill(null);
            }
        }
        
        return weeks;
    }, [currentMonth, trades]);

    const monthlyStats = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const monthTrades = trades.filter(t => {
            const d = new Date(t.trade_date || t.created_at);
            return d.getFullYear() === year && d.getMonth() === month;
        });
        const pl = monthTrades.reduce((sum, t) => sum + (t.money_value || 0), 0);
        return { pl, count: monthTrades.length };
    }, [currentMonth, trades]);

    const cumulativeData = useMemo(() => {
        const sorted = [...trades].sort((a, b) => new Date(a.trade_date || a.created_at).getTime() - new Date(b.trade_date || b.created_at).getTime());
        let current = 0;
        return sorted.map(t => {
            current += (t.money_value || 0);
            return current;
        });
    }, [trades]);

    const renderEquityCurve = () => {
        if (cumulativeData.length < 2) return null;
        const h = 100;
        const w = SCREEN_WIDTH - 64;
        const min = Math.min(...cumulativeData, 0);
        const max = Math.max(...cumulativeData, 100);
        const range = max - min;
        
        const points = cumulativeData.map((val, i) => {
            const x = (i / (cumulativeData.length - 1)) * w;
            const y = h - ((val - min) / range) * h;
            return `${x},${y}`;
        }).join(' ');

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.sectionTitle}>Cumulative Performance</Text>
                <Svg height={h} width={w}>
                    <Polyline
                        points={points}
                        fill="none"
                        stroke="#4299E1"
                        strokeWidth="2"
                    />
                </Svg>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <ScrollView 
                style={styles.container} 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4299E1" />}
            >
                <View style={styles.header}>
                    <Text style={styles.monthTitle}>
                        {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
                            <FontAwesome name="chevron-left" size={16} color="#4A5568" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.todayBtn} onPress={() => setCurrentMonth(new Date())}>
                            <Text style={styles.todayText}>Today</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
                            <FontAwesome name="chevron-right" size={16} color="#4A5568" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.calendarGrid}>
                    <View style={styles.weekHeader}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'P&L'].map(d => (
                            <Text key={d} style={styles.weekDayText}>{d}</Text>
                        ))}
                    </View>
                    
                    {calendarData.map((week, i) => {
                        const weekPL = week.reduce((sum, d) => sum + (d?.pl || 0), 0);
                        return (
                            <View key={i} style={styles.weekRow}>
                                {week.map((dayData, j) => (
                                    <TouchableOpacity 
                                        key={j} 
                                        style={[
                                            styles.dayCell, 
                                            dayData?.pl > 0 && styles.dayProfit,
                                            dayData?.pl < 0 && styles.dayLoss,
                                            dayData?.date === selectedDate && styles.daySelected
                                        ]}
                                        onPress={() => dayData && setSelectedDate(dayData.date)}
                                    >
                                        <Text style={styles.dayNum}>{dayData?.day}</Text>
                                        {dayData && dayData.trades.length > 0 && (
                                            <>
                                                <Text style={[styles.dayPL, { color: dayData.pl >= 0 ? '#2F855A' : '#C53030' }]}>
                                                    ${Math.abs(dayData.pl).toFixed(0)}
                                                </Text>
                                                <Text style={styles.dayTradeCount}>{dayData.trades.length} trade{dayData.trades.length > 1 ? 's' : ''}</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                ))}
                                <View style={[styles.dayCell, styles.weekPLCell, { backgroundColor: weekPL >= 0 ? '#F0FFF4' : '#FFF5F5' }]}>
                                    <Text style={styles.weekPLTitle}>Week</Text>
                                    <Text style={[styles.weekPLValue, { color: weekPL >= 0 ? '#2F855A' : '#C53030' }]}>
                                        {weekPL >= 0 ? '+' : '-'}${Math.abs(weekPL).toFixed(0)}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.monthlyFooter}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Monthly P&L</Text>
                        <Text style={[styles.statValue, { color: monthlyStats.pl >= 0 ? '#2F855A' : '#C53030' }]}>
                            ${monthlyStats.pl.toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Total Trades</Text>
                        <Text style={styles.statValue}>{monthlyStats.count}</Text>
                    </View>
                    <Text style={styles.clickHint}>Click on any date to view trades</Text>
                </View>

                {renderEquityCurve()}

                <View style={styles.historySection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Trades for {selectedDate}</Text>
                        <View style={[styles.plBadge, { backgroundColor: trades.filter(t => (t.trade_date || t.created_at.split('T')[0]) === selectedDate).reduce((sum, t) => sum + (t.money_value || 0), 0) >= 0 ? '#F0FFF4' : '#FFF5F5' }]}>
                            <Text style={[styles.plBadgeText, { color: trades.filter(t => (t.trade_date || t.created_at.split('T')[0]) === selectedDate).reduce((sum, t) => sum + (t.money_value || 0), 0) >= 0 ? '#2F855A' : '#C53030' }]}>
                                ${trades.filter(t => (t.trade_date || t.created_at.split('T')[0]) === selectedDate).reduce((sum, t) => sum + (t.money_value || 0), 0).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                    {trades.filter(t => (t.trade_date || t.created_at.split('T')[0]) === selectedDate).length > 0 ? (
                        trades.filter(t => (t.trade_date || t.created_at.split('T')[0]) === selectedDate).map(trade => (
                            <TouchableOpacity 
                                key={trade.id} 
                                style={styles.historyItem}
                                onPress={() => { setSelectedTrade(trade); setModalVisible(true); }}
                            >
                                <View style={styles.historyMain}>
                                    <Text style={styles.historySymbol}>{trade.currency_pair}</Text>
                                    <Text style={styles.historyType}>{trade.trade_type} @ {trade.entry_price || '—'}</Text>
                                </View>
                                <View style={styles.historyRight}>
                                    <Text style={[styles.historyPL, { color: (trade.money_value || 0) >= 0 ? '#2F855A' : '#C53030' }]}>
                                        {(trade.money_value || 0) >= 0 ? '+' : ''}${trade.money_value?.toFixed(2)}
                                    </Text>
                                    <Text style={styles.historyDate}>{trade.created_at.split('T')[1].slice(0, 5)}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No trades for this date.</Text>
                    )}

                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Recent History</Text>
                    {trades.slice(0, 10).map(trade => (
                        <TouchableOpacity 
                            key={trade.id} 
                            style={styles.historyItem}
                            onPress={() => { setSelectedTrade(trade); setModalVisible(true); }}
                        >
                            <View style={styles.historyMain}>
                                <Text style={styles.historySymbol}>{trade.currency_pair}</Text>
                                <Text style={styles.historyDate}>{trade.trade_date || trade.created_at.split('T')[0]}</Text>
                            </View>
                            <View style={styles.historyRight}>
                                <Text style={[styles.historyPL, { color: (trade.money_value || 0) >= 0 ? '#2F855A' : '#C53030' }]}>
                                    {(trade.money_value || 0) >= 0 ? '+' : ''}${trade.money_value?.toFixed(2)}
                                </Text>
                                <Text style={styles.historyType}>{trade.trade_type}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
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
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    monthTitle: { fontSize: 22, fontWeight: '800', color: '#2D3748' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    todayBtn: { backgroundColor: '#4299E1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    todayText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    calendarGrid: { paddingHorizontal: 10 },
    weekHeader: { flexDirection: 'row', marginBottom: 10 },
    weekDayText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#A0AEC0' },
    weekRow: { flexDirection: 'row', marginBottom: 8, gap: 4 },
    dayCell: { flex: 1, height: 70, backgroundColor: '#F7FAFC', borderRadius: 10, padding: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EDF2F7' },
    dayNum: { fontSize: 11, fontWeight: '700', color: '#4A5568', position: 'absolute', top: 4, left: 4 },
    dayPL: { fontSize: 12, fontWeight: '800', marginTop: 10 },
    dayTradeCount: { fontSize: 9, color: '#718096', fontWeight: '500' },
    dayProfit: { backgroundColor: '#F0FFF4', borderColor: '#C6F6D5' },
    dayLoss: { backgroundColor: '#FFF5F5', borderColor: '#FED7D7' },
    daySelected: { borderColor: '#4299E1', borderWidth: 2 },
    weekPLCell: { borderLeftWidth: 2, borderLeftColor: '#E2E8F0' },
    weekPLTitle: { fontSize: 9, fontWeight: '700', color: '#A0AEC0', textTransform: 'uppercase' },
    weekPLValue: { fontSize: 12, fontWeight: '800' },
    monthlyFooter: { flexDirection: 'row', padding: 20, backgroundColor: '#F0FFF4', margin: 16, borderRadius: 16, alignItems: 'center', gap: 20 },
    statBox: { gap: 4 },
    statLabel: { fontSize: 12, fontWeight: '600', color: '#2F855A' },
    statValue: { fontSize: 20, fontWeight: '800' },
    clickHint: { flex: 1, textAlign: 'right', fontSize: 12, color: '#718096', fontStyle: 'italic' },
    chartContainer: { padding: 20, gap: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#2D3748' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    plBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    plBadgeText: { fontSize: 14, fontWeight: '800' },
    historySection: { padding: 20, gap: 12, paddingBottom: 40 },
    emptyText: { color: '#A0AEC0', fontSize: 14, fontStyle: 'italic' },
    historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F7FAFC', borderRadius: 12 },
    historyMain: { gap: 2 },
    historySymbol: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
    historyDate: { fontSize: 12, color: '#718096' },
    historyRight: { alignItems: 'flex-end', gap: 2 },
    historyPL: { fontSize: 16, fontWeight: '800' },
    historyType: { fontSize: 11, fontWeight: '700', color: '#A0AEC0' },
});
