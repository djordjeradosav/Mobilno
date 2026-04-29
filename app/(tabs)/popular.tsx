import { Calendar } from 'react-native-calendars';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Forecast } from '@/components/ForecastCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';

export default function Popular() {
    const { user } = useAuth();
    const [trades, setTrades] = useState<Forecast[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

    // Group trades by date and calculate profit/loss for each day
    const markedDates = useMemo(() => {
        const marked: any = {};
        const dailyPL: { [key: string]: number } = {};

        trades.forEach(trade => {
            const date = trade.trade_date || trade.created_at.split('T')[0];
            dailyPL[date] = (dailyPL[date] || 0) + (trade.money_value || 0);
        });

        Object.keys(dailyPL).forEach(date => {
            const pl = dailyPL[date];
            marked[date] = {
                marked: true,
                dotColor: pl > 0 ? '#48BB78' : pl < 0 ? '#F56565' : '#CBD5E0',
                customStyles: {
                    container: {
                        backgroundColor: pl > 0 ? '#F0FFF4' : pl < 0 ? '#FFF5F5' : '#F7FAFC',
                        borderRadius: 8,
                    },
                    text: {
                        color: pl > 0 ? '#2F855A' : pl < 0 ? '#C53030' : '#4A5568',
                        fontWeight: 'bold',
                    }
                }
            };
        });

        // Highlight selected date
        marked[selectedDate] = {
            ...marked[selectedDate],
            selected: true,
            selectedColor: '#4299E1',
        };

        return marked;
    }, [trades, selectedDate]);

    const selectedDayTrades = useMemo(() => {
        return trades.filter(t => (t.trade_date || t.created_at.split('T')[0]) === selectedDate);
    }, [trades, selectedDate]);

    const totalPL = useMemo(() => {
        return selectedDayTrades.reduce((sum, t) => sum + (t.money_value || 0), 0);
    }, [selectedDayTrades]);

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Trading Calendar</Text>
                <Text style={styles.headerSub}>Track your daily performance</Text>
            </View>

            <ScrollView 
                style={styles.container} 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4299E1" />}
            >
                <View style={styles.calendarCard}>
                    <Calendar
                        onDayPress={day => setSelectedDate(day.dateString)}
                        markedDates={markedDates}
                        theme={{
                            calendarBackground: '#ffffff',
                            textSectionTitleColor: '#b6c1cd',
                            selectedDayBackgroundColor: '#4299E1',
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: '#4299E1',
                            dayTextColor: '#2d4150',
                            textDisabledColor: '#d9e1e8',
                            dotColor: '#4299E1',
                            selectedDotColor: '#ffffff',
                            arrowColor: '#4299E1',
                            monthTextColor: '#2d3748',
                            indicatorColor: '#4299E1',
                            textDayFontWeight: '600',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600',
                            textDayFontSize: 14,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 12
                        }}
                    />
                </View>

                <View style={styles.detailsSection}>
                    <View style={styles.detailsHeader}>
                        <Text style={styles.detailsTitle}>
                            {new Date(selectedDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </Text>
                        <View style={[styles.plBadge, { backgroundColor: totalPL >= 0 ? '#F0FFF4' : '#FFF5F5' }]}>
                            <Text style={[styles.plText, { color: totalPL >= 0 ? '#2F855A' : '#C53030' }]}>
                                {totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)}
                            </Text>
                        </View>
                    </View>

                    {loading ? (
                        <ActivityIndicator color="#4299E1" style={{ marginTop: 20 }} />
                    ) : selectedDayTrades.length > 0 ? (
                        selectedDayTrades.map(trade => (
                            <TouchableOpacity 
                                key={trade.id} 
                                style={styles.tradeItem}
                                onPress={() => { setSelectedTrade(trade); setModalVisible(true); }}
                            >
                                <View style={styles.tradeMain}>
                                    <View style={[styles.typeIndicator, { backgroundColor: trade.trade_type === 'Buy' ? '#4299E1' : '#F56565' }]} />
                                    <View>
                                        <Text style={styles.tradeSymbol}>{trade.currency_pair}</Text>
                                        <Text style={styles.tradeType}>{trade.trade_type} @ {trade.entry_price || '—'}</Text>
                                    </View>
                                </View>
                                <View style={styles.tradeRight}>
                                    <Text style={[styles.tradeValue, { color: (trade.money_value || 0) >= 0 ? '#2F855A' : '#C53030' }]}>
                                        {(trade.money_value || 0) >= 0 ? '+' : ''}${trade.money_value?.toFixed(2)}
                                    </Text>
                                    <Text style={styles.tradeTime}>{trade.created_at.split('T')[1].slice(0, 5)}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No trades recorded for this day.</Text>
                        </View>
                    )}
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
    root: { flex: 1, backgroundColor: '#F7FAFC' },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#1A202C' },
    headerSub: { fontSize: 14, color: '#718096', marginTop: 2 },
    container: { flex: 1 },
    calendarCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    detailsSection: { paddingHorizontal: 16, paddingBottom: 40 },
    detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    detailsTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
    plBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    plText: { fontSize: 16, fontWeight: '800' },
    tradeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    tradeMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    typeIndicator: { width: 4, height: 32, borderRadius: 2 },
    tradeSymbol: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
    tradeType: { fontSize: 13, color: '#718096', fontWeight: '500' },
    tradeRight: { alignItems: 'flex-end' },
    tradeValue: { fontSize: 16, fontWeight: '800' },
    tradeTime: { fontSize: 11, color: '#A0AEC0', marginTop: 2 },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#A0AEC0', fontSize: 15, fontWeight: '500' },
});
