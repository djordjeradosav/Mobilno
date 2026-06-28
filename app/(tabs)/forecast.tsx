import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { uploadForecastImage } from "@/lib/uploadImage";
import * as ImagePicker from 'expo-image-picker';
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
import { useTheme } from '@/components/ThemeContext';
import Colors from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { syncUserToSupabase } from '@/lib/syncUser';

export default function CreateForecast() {
    const { user } = useAuth();
    const router = useRouter();
    const { colorScheme } = useTheme();
    const C = Colors[colorScheme];

    const [symbol, setSymbol] = useState('');
    const [moneyValue, setMoneyValue] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [tradeType, setTradeType] = useState<'Buy' | 'Sell'>('Buy');
    const [entryPrice, setEntryPrice] = useState('');
    const [exitPrice, setExitPrice] = useState('');
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        if (Platform.OS !== 'web') {
            const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!granted) return Alert.alert('Error', 'Permission needed to access gallery.');
        }
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        if (!res.canceled) setImageUri(res.assets[0].uri);
    };

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

        let chartUrl = imageUri ? await uploadForecastImage(imageUri, user.id) : null;

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
                chart_image_url: chartUrl,
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
        setImageUri(null);
        setNotes('');
        setEntryPrice('');
        setExitPrice('');
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: C.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]} 
                    onPress={() => router.back()}
                >
                    <FontAwesome name="arrow-left" size={16} color={C.iconDefault} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: C.text }]}>New Trade</Text>
                    <Text style={[styles.headerSub, { color: C.textMuted }]}>Add a trade to your journal</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={[styles.dividerLine, { backgroundColor: C.border }]} />

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
                            <Text style={[styles.label, { color: C.textMuted }]}>Symbol *</Text>
                            <View style={[styles.inputWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                                <TextInput
                                    style={[styles.input, { color: C.text }]}
                                    placeholder="AAPL, BTC…"
                                    placeholderTextColor={C.placeholder}
                                    value={symbol}
                                    onChangeText={setSymbol}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={[styles.label, { color: C.textMuted }]}>Type</Text>
                            <View style={[styles.typeSelector, { backgroundColor: C.surface, borderColor: C.border }]}>
                                <TouchableOpacity
                                    style={[styles.typeBtn, tradeType === 'Buy' && { backgroundColor: 'rgba(14,203,129,0.15)' }]}
                                    onPress={() => setTradeType('Buy')}
                                >
                                    <Text style={[styles.typeText, { color: C.textMuted }, tradeType === 'Buy' && { color: '#0ECB81', fontWeight: '800' }]}>Buy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeBtn, tradeType === 'Sell' && { backgroundColor: 'rgba(246,70,93,0.15)' }]}
                                    onPress={() => setTradeType('Sell')}
                                >
                                    <Text style={[styles.typeText, { color: C.textMuted }, tradeType === 'Sell' && { color: '#F6465D', fontWeight: '800' }]}>Sell</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Money Value */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: C.textMuted }]}>Profit / Loss ($) *</Text>
                        <View style={[styles.inputWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                            <Text style={[styles.inputPrefix, { color: C.textMuted }]}>$</Text>
                            <TextInput
                                style={[styles.input, { color: C.text }]}
                                placeholder="0.00"
                                placeholderTextColor={C.placeholder}
                                keyboardType="numeric"
                                value={moneyValue}
                                onChangeText={setMoneyValue}
                            />
                        </View>
                    </View>

                    {/* Entry / Exit row */}
                    <View style={styles.row}>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={[styles.label, { color: C.textMuted }]}>Entry Price</Text>
                            <View style={[styles.inputWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                                <TextInput
                                    style={[styles.input, { color: C.text }]}
                                    placeholder="0.00"
                                    placeholderTextColor={C.placeholder}
                                    keyboardType="numeric"
                                    value={entryPrice}
                                    onChangeText={setEntryPrice}
                                />
                            </View>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={[styles.label, { color: C.textMuted }]}>Exit Price</Text>
                            <View style={[styles.inputWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                                <TextInput
                                    style={[styles.input, { color: C.text }]}
                                    placeholder="0.00"
                                    placeholderTextColor={C.placeholder}
                                    keyboardType="numeric"
                                    value={exitPrice}
                                    onChangeText={setExitPrice}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Chart Image */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: C.textMuted }]}>Chart</Text>
                        {imageUri ? (
                            <View style={[styles.previewCard, { borderColor: C.border }]}>
                                <Image source={{ uri: imageUri }} style={[styles.previewImage, { backgroundColor: C.surface }]} resizeMode="cover" />
                                <TouchableOpacity style={styles.removeImgBtn} onPress={() => setImageUri(null)}>
                                    <FontAwesome name="times" size={14} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={[styles.pickImgBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={pickImage}>
                                <FontAwesome name="picture-o" size={20} color={C.iconDefault} />
                                <Text style={[styles.pickImgText, { color: C.textMuted }]}>Choose chart</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Notes */}
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: C.textMuted }]}>Trade Notes</Text>
                        <TextInput
                            style={[styles.textArea, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
                            placeholder="What was your reasoning for this trade?"
                            placeholderTextColor={C.placeholder}
                            multiline
                            numberOfLines={4}
                            value={notes}
                            onChangeText={setNotes}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Submit */}
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: C.accent }, loading && styles.disabled]}
                        onPress={handleCreate}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color={C.textInverse} />
                            : <Text style={[styles.submitBtnText, { color: C.textInverse }]}>Add to Journal →</Text>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
                        <Text style={[styles.cancelText, { color: C.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>

                    <View style={{ height: 60 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
    headerSub: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 2 },
    dividerLine: { height: 1 },

    scroll: { padding: 20, gap: 16 },
    row: { flexDirection: 'row', gap: 12 },
    field: { gap: 8 },
    section: { gap: 8 },

    label: {
        fontSize: 11, fontWeight: '800',
        textTransform: 'uppercase', letterSpacing: 1.2,
    },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 14,
        height: 52,
        borderWidth: 1,
    },
    inputIcon: { marginRight: 10 },
    inputPrefix: { fontWeight: '700', marginRight: 6, fontSize: 15 },
    input: { flex: 1, fontSize: 15, fontWeight: '600' },

    typeSelector: {
        flexDirection: 'row',
        borderRadius: 8,
        height: 52,
        borderWidth: 1,
        padding: 4,
    },
    typeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
    typeText: { fontSize: 14, fontWeight: '700' },

    textArea: {
        borderRadius: 8,
        padding: 14,
        fontSize: 14,
        minHeight: 110,
        borderWidth: 1,
    },

    previewCard: {
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
    },
    previewImage: { width: '100%', height: 180 },
    pickImgBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 24, borderWidth: 1.5, borderStyle: 'dashed' },
    pickImgText: { fontSize: 14, fontWeight: '700' },
    removeImgBtn: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },

    submitBtn: {
        height: 56, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        marginTop: 8,
    },
    disabled: { opacity: 0.6 },
    submitBtnText: { fontSize: 15, fontWeight: '900' },
    cancelBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 14, fontWeight: '700' },
});