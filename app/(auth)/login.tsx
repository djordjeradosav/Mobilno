import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/ThemeContext';
import Colors from '@/constants/Colors';

export default function Login() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateForm = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleLogin = async () => {
    if (!form.email.trim() || !form.password) return Alert.alert('Error', 'Fill all fields.');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password });
      if (error) throw error;
      router.replace('/(tabs)/popular');
    } catch (err: any) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!form.email.trim()) return Alert.alert('Error', 'Enter email to reset.');
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim().toLowerCase());
    Alert.alert(error ? 'Error' : 'Success', error ? error.message : 'Check email for link.');
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]}>
      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={[s.backBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => router.back()}><FontAwesome name="arrow-left" size={16} color={C.iconDefault} /></TouchableOpacity>
        <Text style={[s.brand, { color: C.accent }]}>Ticksnap</Text>
        <Text style={[s.title, { color: C.text }]}>Welcome back</Text>
        <View style={s.fieldWrap}>
          <Text style={[s.label, { color: C.textMuted }]}>Email</Text>
          <View style={[s.inputRow, { backgroundColor: C.inputBackground, borderColor: C.border }]}>
            <FontAwesome name="envelope-o" size={15} color={C.iconDefault} style={s.inputIcon} />
            <TextInput style={[s.input, { color: C.text }]} placeholder="you@email.com" placeholderTextColor={C.placeholder} value={form.email} onChangeText={v => updateForm('email', v)} autoCapitalize="none" keyboardType="email-address" />
          </View>
        </View>
        <View style={s.fieldWrap}>
          <View style={s.rowBetween}><Text style={[s.label, { color: C.textMuted }]}>Password</Text><TouchableOpacity onPress={resetPassword}><Text style={[s.forgot, { color: C.accent }]}>Forgot?</Text></TouchableOpacity></View>
          <View style={[s.inputRow, { backgroundColor: C.inputBackground, borderColor: C.border }]}>
            <FontAwesome name="lock" size={15} color={C.iconDefault} style={s.inputIcon} />
            <TextInput style={[s.input, { color: C.text }]} placeholder="••••••••" placeholderTextColor={C.placeholder} value={form.password} onChangeText={v => updateForm('password', v)} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}><FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={15} color={C.iconDefault} /></TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color={C.textInverse} /> : <Text style={[s.primaryBtnText, { color: C.textInverse }]}>Log In →</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={s.linkBtn}>
          <Text style={[s.linkText, { color: C.textMuted }]}>Don't have an account? <Text style={[s.linkBold, { color: C.accent }]}>Register</Text></Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 32 },
  brand: { fontSize: 17, fontWeight: '900', fontStyle: 'italic', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 36 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  primaryBtn: { height: 56, borderRadius: 16, backgroundColor: '#F0B90B', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  disabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '900' },
  linkBtn: { paddingBottom: 8, alignItems: 'center' },
  linkText: { fontSize: 13 },
  linkBold: { fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgot: { fontSize: 11, fontWeight: '800' },
});
