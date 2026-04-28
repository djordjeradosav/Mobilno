import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
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

const CURRENCY_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'BTC/USD', 'ETH/USD', 'GOLD'];

export default function CreateForecast() {
    const { user } = useAuth();
    const router = useRouter();
    const [content, setContent] = useState('');
    const [pair, setPair] = useState('EUR/USD');
    const [profit, setProfit] = useState('');
    const [chartUrl, setChartUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!user?.id) {
            Alert.alert('Error', 'You must be logged in to post.');
            return;
        }
        if (!content.trim()) {
            Alert.alert('Error', 'Please enter your analysis');
            return;
        }
        if (!profit || isNaN(Number(profit))) {
            Alert.alert('Error', 'Please enter a valid profit percentage');
            return;
        }

        setLoading(true);

        // Use the bypass RPC function
        const { data, error } = await supabase.rpc('create_forecast_v2', {
            p_content: content.trim(),
            p_currency_pair: pair,
            p_profit: Number(profit),
            p_chart_image_url: chartUrl.trim() || null
        });

        setLoading(false);
        if (error) {
            console.error('[handleCreate] RPC Error:', JSON.stringify(error, null, 2));
            Alert.alert('Error', `Could not create forecast: ${error.message}`);
        } else {
            Alert.alert('Success', 'Your forecast has been posted!', [
                { text: 'OK', onPress: () => router.push('/(tabs)/popular') }
            ]);
            setContent('');
            setProfit('');
            setChartUrl('');
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
                        <Text style={styles.headerTitle}>New Forecast</Text>
                        <Text style={styles.headerSub}>Share your market analysis with the community</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Select Asset</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pairRow}>
                            {CURRENCY_PAIRS.map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.pairBtn, pair === p && styles.pairBtnActive]}
                                    onPress={() => setPair(p)}
                                >
                                    <Text style={[styles.pairText, pair === p && styles.pairTextActive]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Profit / Loss (%)</Text>
                        <View style={styles.inputWrap}>
                            <FontAwesome name="percent" size={14} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 2.5 or -1.2"
                                placeholderTextColor="#999"
                                value={profit}
                                onChangeText={setProfit}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Chart Image URL (Optional)</Text>
                        <View style={styles.inputWrap}>
                            <FontAwesome name="link" size={14} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Paste TradingView or image link"
                                placeholderTextColor="#999"
                                value={chartUrl}
                                onChangeText={setChartUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        {chartUrl.trim().length > 0 && (
                            <View style={styles.previewContainer}>
                                <Text style={styles.previewLabel}>Preview:</Text>
                                <Image
                                    source={{ uri: chartUrl }}
                                    style={styles.previewImage}
                                    resizeMode="cover"
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Analysis & Reasoning</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="What's your strategy? Why this trade?"
                            placeholderTextColor="#999"
                            value={content}
                            onChangeText={setContent}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#1a1a1a" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>Post Forecast</Text>
                                <MaterialIcons name="send" size={18} color="#1a1a1a" />
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    scroll: { padding: 20, gap: 24 },
    header: { gap: 4 },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', letterSpacing: -0.5 },
    headerSub: { fontSize: 14, color: '#888', fontWeight: '500' },
    section: { gap: 12 },
    label: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
    pairRow: { gap: 10, paddingBottom: 4 },
    pairBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
    pairBtnActive: { backgroundColor: '#F5C400', borderColor: '#F5C400' },
    pairText: { fontSize: 14, fontWeight: '700', color: '#666' },
    pairTextActive: { color: '#1a1a1a' },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#eee' },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#1a1a1a', fontWeight: '600' },
    previewContainer: { marginTop: 8, gap: 8 },
    previewLabel: { fontSize: 12, color: '#999', fontWeight: '600' },
    previewImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#eee' },
    textArea: { backgroundColor: '#fff', borderRadius: 16, padding: 16, fontSize: 16, color: '#1a1a1a', fontWeight: '500', minHeight: 150, borderWidth: 1, borderColor: '#eee' },
    submitBtn: { backgroundColor: '#F5C400', borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#F5C400', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, marginTop: 12 },
    submitBtnText: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
});