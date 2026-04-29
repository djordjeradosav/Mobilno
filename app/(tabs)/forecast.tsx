import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getTradingViewImageUrl } from '@/components/ForecastCard';

export default function CreateForecast() {
    const { user } = useAuth();
    const router = useRouter();
    
    // Form States
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [symbol, setSymbol] = useState('');
    const [tradeType, setTradeType] = useState<'Buy' | 'Sell'>('Buy');
    const [entryPrice, setEntryPrice] = useState('');
    const [exitPrice, setExitPrice] = useState('');
    const [moneyValue, setMoneyValue] = useState('');
    const [tvLink, setTvLink] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!user?.id) {
            Alert.alert('Error', 'You must be logged in to post.');
            return;
        }
        if (!symbol.trim()) {
            Alert.alert('Error', 'Please enter a symbol (e.g. AAPL, BTC/USD)');
            return;
        }
        if (!moneyValue || isNaN(Number(moneyValue))) {
            Alert.alert('Error', 'Please enter a valid money value (profit/loss amount)');
            return;
        }

        setLoading(true);

        // Calculate profit percentage if entry/exit are provided
        let profitPct = 0;
        if (entryPrice && exitPrice) {
            const entry = Number(entryPrice);
            const exit = Number(exitPrice);
            if (entry > 0) {
                profitPct = tradeType === 'Buy' 
                    ? ((exit - entry) / entry) * 100 
                    : ((entry - exit) / entry) * 100;
            }
        } else {
            // Fallback or manual entry if needed, but for now we use moneyValue logic
            // In a real app, you'd probably want to store both.
        }

        const { error } = await supabase.rpc('add_new_trade', {
            p_symbol: symbol.trim().toUpperCase(),
            p_trade_type: tradeType,
            p_entry_price: entryPrice ? Number(entryPrice) : null,
            p_exit_price: exitPrice ? Number(exitPrice) : null,
            p_money_value: Number(moneyValue),
            p_trade_date: date,
            p_tradingview_link: tvLink.trim() || null,
            p_notes: notes.trim(),
            p_chart_image_url: tvLink.trim() || null
        });

        setLoading(false);
        if (error) {
            console.error('[handleCreate] RPC Error:', JSON.stringify(error, null, 2));
            Alert.alert('Error', `Could not create trade: ${error.message}`);
        } else {
            Alert.alert('Success', 'Trade added to your journal!', [
                { text: 'OK', onPress: () => router.push('/(tabs)/popular') }
            ]);
            // Reset form
            setSymbol('');
            setEntryPrice('');
            setExitPrice('');
            setMoneyValue('');
            setTvLink('');
            setNotes('');
        }
    };

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Add New Trade</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Date</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    value={date}
                                    onChangeText={setDate}
                                    placeholder="YYYY-MM-DD"
                                />
                                <FontAwesome name="calendar" size={16} color="#999" />
                            </View>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Symbol *</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="AAPL, TSLA, etc."
                                    value={symbol}
                                    onChangeText={setSymbol}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Trade Type</Text>
                            <View style={styles.typeSelector}>
                                <TouchableOpacity 
                                    style={[styles.typeBtn, tradeType === 'Buy' && styles.typeBtnActive]} 
                                    onPress={() => setTradeType('Buy')}
                                >
                                    <Text style={[styles.typeText, tradeType === 'Buy' && styles.typeTextActive]}>Buy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.typeBtn, tradeType === 'Sell' && styles.typeBtnActive]} 
                                    onPress={() => setTradeType('Sell')}
                                >
                                    <Text style={[styles.typeText, tradeType === 'Sell' && styles.typeTextActive]}>Sell</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Entry Price ($)</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="150.00 (optional)"
                                    keyboardType="numeric"
                                    value={entryPrice}
                                    onChangeText={setEntryPrice}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Exit Price ($)</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="155.00 (optional)"
                                    keyboardType="numeric"
                                    value={exitPrice}
                                    onChangeText={setExitPrice}
                                />
                            </View>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Money Value ($) *</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="500 (profit/loss amount)"
                                    keyboardType="numeric"
                                    value={moneyValue}
                                    onChangeText={setMoneyValue}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>TradingView Link</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={styles.input}
                                placeholder="https://www.tradingview.com/chart/..."
                                value={tvLink}
                                onChangeText={setTvLink}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Notes</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Trade notes..."
                            multiline
                            numberOfLines={4}
                            value={notes}
                            onChangeText={setNotes}
                            textAlignVertical="top"
                        />
                    </View>

                    {tvLink.trim().length > 0 && (
                        <View style={styles.previewContainer}>
                            <Text style={styles.previewLabel}>Chart Preview:</Text>
                            <Image
                                source={{ uri: getTradingViewImageUrl(tvLink) || '' }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                        </View>
                    )}

                    <View style={styles.footerBtns}>
                        <TouchableOpacity 
                            style={styles.cancelBtn} 
                            onPress={() => router.back()}
                        >
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
                            onPress={handleCreate}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Trade</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    scroll: { padding: 20, gap: 20 },
    header: { marginBottom: 10 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#2D3748' },
    row: { flexDirection: 'row', gap: 15 },
    field: { flex: 1, gap: 8 },
    section: { gap: 8 },
    label: { fontSize: 14, fontWeight: '700', color: '#4A5568' },
    inputWrap: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F7FAFC', 
        borderRadius: 10, 
        paddingHorizontal: 12, 
        height: 48, 
        borderWidth: 1, 
        borderColor: '#E2E8F0' 
    },
    input: { flex: 1, fontSize: 15, color: '#2D3748' },
    typeSelector: { flexDirection: 'row', backgroundColor: '#F7FAFC', borderRadius: 10, height: 48, borderWidth: 1, borderColor: '#E2E8F0', padding: 4 },
    typeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
    typeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    typeText: { fontSize: 14, fontWeight: '600', color: '#718096' },
    typeTextActive: { color: '#2D3748' },
    textArea: { 
        backgroundColor: '#F7FAFC', 
        borderRadius: 10, 
        padding: 12, 
        fontSize: 15, 
        color: '#2D3748', 
        minHeight: 100, 
        borderWidth: 1, 
        borderColor: '#E2E8F0' 
    },
    previewContainer: { gap: 8 },
    previewLabel: { fontSize: 12, color: '#718096', fontWeight: '600' },
    previewImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#EDF2F7' },
    footerBtns: { flexDirection: 'row', gap: 12, marginTop: 10 },
    cancelBtn: { flex: 1, height: 48, borderRadius: 10, backgroundColor: '#1A202C', alignItems: 'center', justifyContent: 'center' },
    cancelBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    submitBtn: { flex: 1, height: 48, borderRadius: 10, backgroundColor: '#4299E1', alignItems: 'center', justifyContent: 'center' },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
