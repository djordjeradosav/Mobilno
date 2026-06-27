import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
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
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><FontAwesome name="arrow-left" size={16} color="#848E9C" /></TouchableOpacity>
        <Text style={s.brand}>Ticksnap</Text>
        <Text style={s.title}>Welcome back</Text>
        <View style={s.fieldWrap}>
          <Text style={s.label}>Email</Text>
          <View style={s.inputRow}>
            <FontAwesome name="envelope-o" size={15} color="#848E9C" style={s.inputIcon} />
            <TextInput style={s.input} placeholder="you@email.com" placeholderTextColor="#474D57" value={form.email} onChangeText={v => updateForm('email', v)} autoCapitalize="none" keyboardType="email-address" />
          </View>
        </View>
        <View style={s.fieldWrap}>
          <View style={s.rowBetween}><Text style={s.label}>Password</Text><TouchableOpacity onPress={resetPassword}><Text style={s.forgot}>Forgot?</Text></TouchableOpacity></View>
          <View style={s.inputRow}>
            <FontAwesome name="lock" size={15} color="#848E9C" style={s.inputIcon} />
            <TextInput style={s.input} placeholder="••••••••" placeholderTextColor="#474D57" value={form.password} onChangeText={v => updateForm('password', v)} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}><FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={15} color="#848E9C" /></TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#0B0E11" /> : <Text style={s.primaryBtnText}>Log In →</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={s.linkBtn}>
          <Text style={s.linkText}>Don't have an account? <Text style={s.linkBold}>Register</Text></Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0E11' },
  kav: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E2026', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2B2F36', marginBottom: 32 },
  brand: { fontSize: 17, fontWeight: '900', fontStyle: 'italic', color: '#F0B90B', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#EAECEF', marginBottom: 36 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', color: '#848E9C', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E2026', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#2B2F36' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#EAECEF' },
  primaryBtn: { height: 56, borderRadius: 16, backgroundColor: '#F0B90B', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  disabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: '#0B0E11' },
  linkBtn: { paddingBottom: 8, alignItems: 'center' },
  linkText: { fontSize: 13, color: '#848E9C' },
  linkBold: { color: '#F0B90B', fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgot: { fontSize: 11, fontWeight: '800', color: '#F0B90B' },
});
