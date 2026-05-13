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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getTradingViewImageUrl } from '@/components/ForecastCard';
import { syncUserToSupabase } from '@/lib/syncUser';

export default function CreateForecast() {
    const { user } = useAuth();
    const router = useRouter();

    const [symbol, setSymbol] = useState('');
    const [moneyValue, setMoneyValue] = useState('');
    const [tvLink, setTvLink] = useState('');
    const [notes, setNotes] = useState('');
    const [tradeType, setTradeType] = useState<'Buy' | 'Sell'>('Buy');
    const [entryPrice, setEntryPrice] = useState('');
    const [exitPrice, setExitPrice] = useState('');
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
            Alert.alert('Error', 'Please enter a valid money value');
            return;
        }

        setLoading(true);

        // Ensure user exists in public.users table
        try {
            await syncUserToSupabase(user.id, user.email?.split('@')[0] || 'trader', user.email || '');
        } catch (e) {
            console.error('User sync failed', e);
        }

        const { error } = await supabase
            .from('trades')
            .insert({
                user_id: user.id,
                symbol: symbol.trim().toUpperCase(),
                trade_type: tradeType,
                entry_price: entryPrice ? Number(entryPrice) : null,
                exit_price: exitPrice ? Number(exitPrice) : null,
                money_value: Number(moneyValue),
                notes: notes.trim() || '',
                chart_image_url: tvLink.trim() || null,
            });

        setLoading(false);

        if (error) {
            Alert.alert('Error', `Could not create trade:\n${error.message}`);
            return;
        }

        Alert.alert('Success', 'Trade posted!', [
            { text: 'OK', onPress: () => router.push('/(tabs)/popular') }
        ]);

        setSymbol('');
        setMoneyValue('');
        setTvLink('');
        setNotes('');
        setEntryPrice('');
        setExitPrice('');
    };

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={16} color="#848E9C" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>New Trade</Text>
                    <Text style={styles.headerSub}>Add a trade to your journal</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.dividerLine} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Symbol + Trade Type row */}
                    <View style={styles.row}>
                        <View style={[styles.field, { flex: 1.2 }]}>
                            <Text style={styles.label}>Symbol *</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="AAPL, BTC…"
                                    placeholderTextColor="#474D57"
                                    value={symbol}
                                    onChangeText={setSymbol}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={styles.label}>Type</Text>
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
                    </View>

                    {/* Money Value */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Profit / Loss ($) *</Text>
                        <View style={styles.inputWrap}>
                            <Text style={styles.inputPrefix}>$</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#474D57"
                                keyboardType="numeric"
                                value={moneyValue}
                                onChangeText={setMoneyValue}
                            />
                        </View>
                    </View>

                    {/* Entry / Exit row */}
                    <View style={styles.row}>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={styles.label}>Entry Price</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor="#474D57"
                                    keyboardType="numeric"
                                    value={entryPrice}
                                    onChangeText={setEntryPrice}
                                />
                            </View>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={styles.label}>Exit Price</Text>
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor="#474D57"
                                    keyboardType="numeric"
                                    value={exitPrice}
                                    onChangeText={setExitPrice}
                                />
                            </View>
                        </View>
                    </View>

                    {/* TradingView Link */}
                    <View style={styles.section}>
                        <Text style={styles.label}>TradingView Chart Link</Text>
                        <View style={styles.inputWrap}>
                            <FontAwesome5 name="chart-line" size={14} color="#848E9C" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="https://www.tradingview.com/x/…"
                                placeholderTextColor="#474D57"
                                value={tvLink}
                                onChangeText={setTvLink}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Chart preview */}
                    {tvLink.trim().length > 0 && (
                        <View style={styles.previewCard}>
                            <Image
                                source={{ uri: getTradingViewImageUrl(tvLink) || '' }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                        </View>
                    )}

                    {/* Notes */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Trade Notes</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="What was your reasoning for this trade?"
                            placeholderTextColor="#474D57"
                            multiline
                            numberOfLines={4}
                            value={notes}
                            onChangeText={setNotes}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.disabled]}
                        onPress={handleCreate}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#0B0E11" />
                            : <Text style={styles.submitBtnText}>Add to Journal →</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <View style={{ height: 60 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0B0E11' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#1E2026',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#2B2F36',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#EAECEF', textAlign: 'center' },
    headerSub: { fontSize: 12, color: '#848E9C', fontWeight: '500', textAlign: 'center', marginTop: 2 },
    dividerLine: { height: 1, backgroundColor: '#2B2F36' },

    scroll: { padding: 20, gap: 16 },
    row: { flexDirection: 'row', gap: 12 },
    field: { gap: 8 },
    section: { gap: 8 },

    label: {
        fontSize: 11, fontWeight: '800', color: '#848E9C',
        textTransform: 'uppercase', letterSpacing: 1.2,
    },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1E2026',
        borderRadius: 8,
        paddingHorizontal: 14,
        height: 52,
        borderWidth: 1, borderColor: '#2B2F36',
    },
    inputIcon: { marginRight: 10 },
    inputPrefix: { color: '#848E9C', fontWeight: '700', marginRight: 6, fontSize: 15 },
    input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#EAECEF' },

    typeSelector: {
        flexDirection: 'row',
        backgroundColor: '#1E2026',
        borderRadius: 8,
        height: 52,
        borderWidth: 1, borderColor: '#2B2F36',
        padding: 4,
    },
    typeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
    buyActive: { backgroundColor: 'rgba(14,203,129,0.15)' },
    sellActive: { backgroundColor: 'rgba(246,70,93,0.15)' },
    buyTextActive: { color: '#0ECB81', fontWeight: '800' },
    sellTextActive: { color: '#F6465D', fontWeight: '800' },
    typeText: { fontSize: 14, fontWeight: '700', color: '#848E9C' },

    textArea: {
        backgroundColor: '#1E2026',
        borderRadius: 8,
        padding: 14,
        fontSize: 14,
        color: '#EAECEF',
        minHeight: 110,
        borderWidth: 1,
        borderColor: '#2B2F36',
    },

    previewCard: {
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2B2F36',
    },
    previewImage: { width: '100%', height: 180, backgroundColor: '#1E2026' },

    submitBtn: {
        height: 56, borderRadius: 8,
        backgroundColor: '#F0B90B',
        alignItems: 'center', justifyContent: 'center',
        marginTop: 8,
    },
    disabled: { opacity: 0.6 },
    submitBtnText: { fontSize: 15, fontWeight: '900', color: '#0B0E11' },
    cancelBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
    cancelText: { color: '#848E9C', fontSize: 14, fontWeight: '700' },
});