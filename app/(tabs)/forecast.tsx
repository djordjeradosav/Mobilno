import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
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
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getTradingViewImageUrl } from '@/components/ForecastCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

        const { error } = await supabase.rpc('add_new_trade', {
            p_symbol: symbol.trim().toUpperCase(),
            p_trade_type: tradeType,
            p_entry_price: entryPrice ? Number(entryPrice) : 0,
            p_exit_price: exitPrice ? Number(exitPrice) : 0,
            p_money_value: Number(moneyValue),
            p_trade_date: date || new Date().toISOString().split('T')[0],
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
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>New Trade</Text>
                    <Text style={styles.headerSub}>Add a trade to your journal</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                    <MaterialIcons name="close" size={24} color="#1a1a1a" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.formContainer}>
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
                                        placeholder="AAPL, BTC, etc."
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
                                        style={[styles.typeBtn, tradeType === 'Buy' && styles.buyActive]} 
                                        onPress={() => setTradeType('Buy')}
                                    >
                                        <Text style={[styles.typeText, tradeType === 'Buy' && styles.buyTextActive]}>Buy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.typeBtn, tradeType === 'Sell' && styles.sellActive]} 
                                        onPress={() => setTradeType('Sell')}
                                    >
                                        <Text style={[styles.typeText, tradeType === 'Sell' && styles.sellTextActive]}>Sell</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.field}>
                                <Text style={styles.label}>Money Value ($) *</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="500.00"
                                        keyboardType="numeric"
                                        value={moneyValue}
                                        onChangeText={setMoneyValue}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.field}>
                                <Text style={styles.label}>Entry Price ($)</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        value={entryPrice}
                                        onChangeText={setEntryPrice}
                                    />
                                </View>
                            </View>
                            <View style={styles.field}>
                                <Text style={styles.label}>Exit Price ($)</Text>
                                <View style={styles.inputWrap}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        value={exitPrice}
                                        onChangeText={setExitPrice}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.label}>TradingView Chart Link</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="https://www.tradingview.com/x/..."
                                    value={tvLink}
                                    onChangeText={setTvLink}
                                    autoCapitalize="none"
                                />
                                <FontAwesome5 name="chart-line" size={16} color="#999" />
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.label}>Notes</Text>
                            <TextInput
                                style={styles.textArea}
                                placeholder="What was your reasoning for this trade?"
                                multiline
                                numberOfLines={4}
                                value={notes}
                                onChangeText={setNotes}
                                textAlignVertical="top"
                            />
                        </View>

                        {tvLink.trim().length > 0 && (
                            <View style={styles.previewContainer}>
                                <Text style={styles.sectionTitle}>Chart Preview</Text>
                                <View style={styles.previewCard}>
                                    <Image
                                        source={{ uri: getTradingViewImageUrl(tvLink) || '' }}
                                        style={styles.previewImage}
                                        resizeMode="cover"
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                    
                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
                            onPress={handleCreate}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#1a1a1a" /> : <Text style={styles.submitBtnText}>Add to Journal</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.cancelBtn} 
                            onPress={() => router.back()}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#1a1a1a' },
    headerSub: { fontSize: 14, color: '#999', fontWeight: '600', marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    formContainer: { padding: 20, gap: 20 },
    row: { flexDirection: 'row', gap: 15 },
    field: { flex: 1, gap: 8 },
    section: { gap: 8 },
    label: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrap: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#f9fafb', 
        borderRadius: 12, 
        paddingHorizontal: 15, 
        height: 52, 
        borderWidth: 1, 
        borderColor: '#f0f0f0' 
    },
    input: { flex: 1, fontSize: 15, color: '#1a1a1a', fontWeight: '600' },
    typeSelector: { flexDirection: 'row', backgroundColor: '#f9fafb', borderRadius: 12, height: 52, borderWidth: 1, borderColor: '#f0f0f0', padding: 4 },
    typeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
    buyActive: { backgroundColor: '#ecfdf5' },
    sellActive: { backgroundColor: '#fef2f2' },
    buyTextActive: { color: '#059669', fontWeight: '800' },
    sellTextActive: { color: '#dc2626', fontWeight: '800' },
    typeText: { fontSize: 14, fontWeight: '700', color: '#999' },
    textArea: { 
        backgroundColor: '#f9fafb', 
        borderRadius: 12, 
        padding: 15, 
        fontSize: 15, 
        color: '#1a1a1a', 
        fontWeight: '600',
        minHeight: 120, 
        borderWidth: 1, 
        borderColor: '#f0f0f0' 
    },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1a1a1a', marginBottom: 10 },
    previewContainer: { marginTop: 10 },
    previewCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0' },
    previewImage: { width: '100%', height: 200, backgroundColor: '#f9fafb' },
    footer: { padding: 20, gap: 12 },
    submitBtn: { height: 56, borderRadius: 16, backgroundColor: '#F5C400', alignItems: 'center', justifyContent: 'center', shadowColor: '#F5C400', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    submitBtnText: { color: '#1a1a1a', fontSize: 16, fontWeight: '900' },
    cancelBtn: { height: 56, alignItems: 'center', justifyContent: 'center' },
    cancelText: { color: '#999', fontSize: 15, fontWeight: '700' },
});
