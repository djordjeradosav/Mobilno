import { supabase } from '@/lib/supabase';
import { uploadForecastImage } from "@/lib/uploadImage";
import { useUser } from '@clerk/clerk-expo';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PAIRS = ['EUR/USD', 'GBP/USD', 'AUD/USD', 'JPY/USD', 'XAU/USD', 'BTC/USD', 'ETH/USD'];

export default function PostForecast() {
    const router = useRouter();
    const { user } = useUser();

    const [pair, setPair] = useState('EUR/USD');
    const [profit, setProfit] = useState('');
    const [content, setContent] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handlePickImage = async () => {
        // On native we need permission; on web this is a no-op
        if (Platform.OS !== 'web') {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('Permission needed', 'Please allow photo library access to attach a chart.');
                return;
            }
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]?.uri) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSubmit = async () => {
        if (!user?.id) {
            Alert.alert('Not signed in', 'Please sign in to post a forecast.');
            return;
        }
        const p = parseFloat(profit);
        if (Number.isNaN(p)) {
            Alert.alert('Invalid return', 'Enter a number for the % return (e.g. 2.5 or -1.2).');
            return;
        }
        if (!content.trim()) {
            Alert.alert('Missing analysis', 'Add a short analysis for your trade.');
            return;
        }

        setSubmitting(true);

        // Upload chart image first (if any)
        let chartUrl: string | null = null;
        if (imageUri) {
            chartUrl = await uploadForecastImage(imageUri, user.id);
            if (!chartUrl) {
                setSubmitting(false);
                Alert.alert(
                    'Image upload failed',
                    'Could not upload the chart image. Make sure the "forecasts" storage bucket exists in Supabase. You can post without an image.',
                );
                return;
            }
        }

        const { error } = await supabase.from('forecasts').insert({
            user_id: user.id,
            currency_pair: pair,
            profit: p,
            content: content.trim(),
            chart_image_url: chartUrl,
        });
        setSubmitting(false);

        if (error) {
            Alert.alert('Could not post', error.message);
            return;
        }
        router.replace('/(tabs)/forecast');
    };

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <FontAwesome name="chevron-left" size={16} color="#1a1a1a" />
                    </TouchableOpacity>
                    <Text style={styles.title}>New Forecast</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.label}>Currency pair</Text>
                    <View style={styles.pairRow}>
                        {PAIRS.map((p) => (
                            <TouchableOpacity
                                key={p}
                                style={[styles.pairChip, pair === p && styles.pairChipActive]}
                                onPress={() => setPair(p)}
                            >
                                <Text style={[styles.pairText, pair === p && styles.pairTextActive]}>
                                    {p}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Return %</Text>
                    <TextInput
                        style={styles.input}
                        value={profit}
                        onChangeText={setProfit}
                        placeholder="e.g. 2.5 or -1.2"
                        placeholderTextColor="#bbb"
                        keyboardType="numbers-and-punctuation"
                    />

                    <Text style={styles.label}>Analysis</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={content}
                        onChangeText={setContent}
                        placeholder="What's your read on this trade?"
                        placeholderTextColor="#bbb"
                        multiline
                        textAlignVertical="top"
                    />

                    <Text style={styles.label}>Chart image (optional)</Text>
                    {imageUri ? (
                        <View style={styles.imagePreview}>
                            <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="cover" />
                            <TouchableOpacity
                                style={styles.removeBtn}
                                onPress={() => setImageUri(null)}
                            >
                                <FontAwesome name="times" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.pickBtn} onPress={handlePickImage} activeOpacity={0.85}>
                            <FontAwesome name="picture-o" size={20} color="#888" />
                            <Text style={styles.pickBtnText}>Choose chart image</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.submit, submitting && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#1a1a1a" />
                        ) : (
                            <Text style={styles.submitText}>Publish forecast</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F5F5F3' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#f0f0ee',
        alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
    content: { padding: 20, gap: 12, paddingBottom: 60 },
    label: { fontSize: 13, fontWeight: '700', color: '#888', marginTop: 8, letterSpacing: 0.3 },
    pairRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pairChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#eee',
    },
    pairChipActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
    pairText: { fontSize: 13, fontWeight: '700', color: '#666' },
    pairTextActive: { color: '#F5C400' },
    input: {
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 15,
        color: '#1a1a1a',
        borderWidth: 1.5,
        borderColor: '#eee',
    },
    textarea: { minHeight: 120 },
    pickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingVertical: 24,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: '#ddd',
    },
    pickBtnText: { fontSize: 14, fontWeight: '700', color: '#888' },
    imagePreview: {
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    previewImg: { width: '100%', height: 200 },
    removeBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submit: {
        marginTop: 16,
        backgroundColor: '#F5C400',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitText: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
});
