import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      router.replace('/(tabs)/popular');
    } catch (err: any) {
      Alert.alert('Login failed', err.message ?? 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={16} color="#848E9C" />
        </TouchableOpacity>

        {/* Header */}
        <Text style={s.brand}>Ticksnap</Text>
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.sub}>Log in to your trading journal</Text>

        {/* Email */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Email</Text>
          <View style={s.inputRow}>
            <FontAwesome name="envelope-o" size={15} color="#848E9C" style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="you@email.com"
              placeholderTextColor="#474D57"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Password */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>Password</Text>
          <View style={s.inputRow}>
            <FontAwesome name="lock" size={15} color="#848E9C" style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#474D57"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
              <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={15} color="#848E9C" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        {/* CTA */}
        <TouchableOpacity
          style={[s.primaryBtn, loading && s.disabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#0B0E11" />
            : <Text style={s.primaryBtnText}>Log In →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={s.linkBtn}>
          <Text style={s.linkText}>
            Don't have an account?{' '}
            <Text style={s.linkBold}>Register</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0E11' },
  kav: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1E2026',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2B2F36',
    marginBottom: 32,
  },
  brand: { fontSize: 17, fontWeight: '900', fontStyle: 'italic', color: '#F0B90B', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#EAECEF', marginBottom: 4 },
  sub: { fontSize: 14, fontWeight: '500', color: '#848E9C', marginBottom: 36 },
  fieldWrap: { marginBottom: 16 },
  label: {
    fontSize: 11, fontWeight: '800', color: '#848E9C',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E2026', borderRadius: 16,
    paddingHorizontal: 16, height: 56,
    borderWidth: 1, borderColor: '#2B2F36',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#EAECEF' },
  eyeBtn: { padding: 6 },
  primaryBtn: {
    height: 56, borderRadius: 16,
    backgroundColor: '#F0B90B',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  disabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: '#0B0E11' },
  linkBtn: { paddingBottom: 8, alignItems: 'center' },
  linkText: { fontSize: 13, color: '#848E9C' },
  linkBold: { color: '#F0B90B', fontWeight: '700' },
});