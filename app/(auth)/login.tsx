import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView, Platform,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Login() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!isLoaded) return;
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)/popular');
      } else {
        Alert.alert('Login failed', 'Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Login failed', err.errors?.[0]?.message ?? 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>

        <Text style={s.title}>Login</Text>

        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="#AAAAAA"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
        />

        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor="#AAAAAA"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <View style={s.spacer} />

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#111111" />
            : <Text style={s.btnText}>Login →</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={s.link}>
            Don't have an account?{' '}
            <Text style={s.linkBold}>Register</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  back: { marginBottom: 24 },
  backText: { fontSize: 24, color: '#111111' },
  title: { fontSize: 28, fontWeight: '800', color: '#111111', marginBottom: 28 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111111',
    marginBottom: 12,
  },
  spacer: { flex: 1 },
  btn: {
    backgroundColor: '#F5C400',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#111111' },
  link: { textAlign: 'center', fontSize: 14, color: '#888888' },
  linkBold: { color: '#111111', fontWeight: '600' },
});
