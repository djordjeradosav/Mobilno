import { supabase } from '@/lib/supabase';
import { uploadForecastImage } from "@/lib/uploadImage";
import { useAuth } from '@/lib/auth';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeContext';
import Colors from '@/constants/Colors';

const PAIRS = ['EUR/USD', 'GBP/USD', 'AUD/USD', 'JPY/USD', 'XAU/USD', 'BTC/USD', 'ETH/USD'];

export default function PostForecast() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];

  const [form, setForm] = useState({ pair: 'EUR/USD', profit: '', content: '' });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) return Alert.alert('Error', 'Permission needed.');
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const submit = async () => {
    if (!user?.id) return Alert.alert('Error', 'Sign in first.');
    const p = parseFloat(form.profit);
    if (isNaN(p)) return Alert.alert('Error', 'Invalid profit.');
    if (!form.content.trim()) return Alert.alert('Error', 'Add analysis.');

    setSubmitting(true);
    let chartUrl = imageUri ? await uploadForecastImage(imageUri, user.id) : null;
    
    const { error } = await supabase.from('trades').insert({
      user_id: user.id, symbol: form.pair, money_value: p, notes: form.content.trim(),
      chart_image_url: chartUrl, trade_type: p >= 0 ? 'Buy' : 'Sell'
    });

    setSubmitting(false);
    if (error) Alert.alert('Error', error.message);
    else router.replace('/(tabs)/popular');
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { backgroundColor: C.surface }]}><FontAwesome name="chevron-left" size={16} color={C.text} /></TouchableOpacity>
          <Text style={[s.title, { color: C.text }]}>New Forecast</Text><View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={[s.label, { color: C.textMuted }]}>Pair</Text>
          <View style={s.pairRow}>{PAIRS.map(p => (
            <TouchableOpacity key={p} style={[s.pairChip, { backgroundColor: C.card, borderColor: C.border }, form.pair === p && { backgroundColor: C.text, borderColor: C.text }]} onPress={() => setForm(f => ({ ...f, pair: p }))}>
              <Text style={[s.pairText, { color: C.textSecondary }, form.pair === p && { color: C.background }]}>{p}</Text>
            </TouchableOpacity>
          ))}</View>
          <Text style={[s.label, { color: C.textMuted }]}>Return %</Text>
          <TextInput style={[s.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]} placeholderTextColor={C.placeholder} value={form.profit} onChangeText={v => setForm(f => ({ ...f, profit: v }))} placeholder="2.5" keyboardType="numbers-and-punctuation" />
          <Text style={[s.label, { color: C.textMuted }]}>Analysis</Text>
          <TextInput style={[s.input, s.textarea, { backgroundColor: C.card, borderColor: C.border, color: C.text }]} placeholderTextColor={C.placeholder} value={form.content} onChangeText={v => setForm(f => ({ ...f, content: v }))} placeholder="Analysis..." multiline />
          <Text style={[s.label, { color: C.textMuted }]}>Chart</Text>
          {imageUri ? (
            <View style={s.preview}><Image source={{ uri: imageUri }} style={s.img} /><TouchableOpacity style={s.remove} onPress={() => setImageUri(null)}><FontAwesome name="times" size={14} color="#fff" /></TouchableOpacity></View>
          ) : (
            <TouchableOpacity style={[s.pick, { backgroundColor: C.card, borderColor: C.border }]} onPress={pickImage}><FontAwesome name="picture-o" size={20} color={C.iconDefault} /><Text style={[s.pickText, { color: C.textMuted }]}>Choose chart</Text></TouchableOpacity>
          )}
          <TouchableOpacity style={[s.submit, { backgroundColor: C.accent }, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color={C.textInverse} /> : <Text style={[s.submitText, { color: C.textInverse }]}>Publish</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  content: { padding: 20, gap: 12 },
  label: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  pairRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pairChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  pairText: { fontSize: 13, fontWeight: '700' },
  input: { borderRadius: 14, padding: 14, fontSize: 15, borderWidth: 1.5 },
  textarea: { minHeight: 120 },
  pick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 24, borderWidth: 1.5, borderStyle: 'dashed' },
  pickText: { fontSize: 14, fontWeight: '700' },
  preview: { borderRadius: 14, overflow: 'hidden' },
  img: { width: '100%', height: 200 },
  remove: { position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  submit: { marginTop: 16, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '800' },
});
