import { supabase } from '@/lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
} from 'react-native';

const Field = ({ label, icon, value, onChange, placeholder, secure, keyboard, toggleSecure }: any) => (
  <View style={s.fieldWrap}>
    <Text style={s.label}>{label}</Text>
    <View style={s.inputRow}>
      <FontAwesome name={icon} size={15} color="#848E9C" style={s.inputIcon} />
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor="#474D57"
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        secureTextEntry={secure}
        keyboardType={keyboard}
      />
      {toggleSecure && (
        <TouchableOpacity onPress={toggleSecure} style={s.eyeBtn}>
          <FontAwesome name={secure ? 'eye' : 'eye-slash'} size={15} color="#848E9C" />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateForm = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    const { username, email, password } = form;
    if (!username.trim() || !email.trim() || !password.trim()) return Alert.alert('Error', 'Fill all fields.');
    if (!agreeTerms) return Alert.alert('Error', 'Agree to terms.');

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { username: username.trim().toLowerCase(), full_name: username.trim() } },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already')) {
          return Alert.alert('Account exists', 'Log in instead?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log in', onPress: () => router.replace('/(auth)/login') },
          ]);
        }
        throw error;
      }
      if (data.user) Alert.alert('Success', 'Check email for link.', [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]);
    } catch (err: any) {
      Alert.alert('Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={16} color="#848E9C" />
        </TouchableOpacity>
        <Text style={s.brand}>Ticksnap</Text>
        <Text style={s.title}>Create account</Text>
        <View style={s.form}>
          <Field label="Username" icon="at" value={form.username} onChange={(v: string) => updateForm('username', v)} placeholder="trader" />
          <Field label="Email" icon="envelope-o" value={form.email} onChange={(v: string) => updateForm('email', v)} placeholder="you@email.com" keyboard="email-address" />
          <Field label="Password" icon="lock" value={form.password} onChange={(v: string) => updateForm('password', v)} placeholder="Min. 8 chars" secure={!showPassword} toggleSecure={() => setShowPassword(!showPassword)} />
          <TouchableOpacity style={s.termsRow} onPress={() => setAgreeTerms(!agreeTerms)}>
            <View style={[s.checkbox, agreeTerms && s.checkboxOn]}>{agreeTerms && <FontAwesome name="check" size={10} color="#0B0E11" />}</View>
            <Text style={s.termsText}>I agree to the <Text style={s.termsLink}>Terms & Policy</Text></Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#0B0E11" /> : <Text style={s.primaryBtnText}>Create Account →</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={s.linkBtn}>
            <Text style={s.linkText}>Already have an account? <Text style={s.linkBold}>Log In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0E11' },
  scroll: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1E2026', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2B2F36', marginBottom: 32 },
  brand: { fontSize: 17, fontWeight: '900', fontStyle: 'italic', color: '#F0B90B', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#EAECEF', marginBottom: 32 },
  form: { gap: 16 },
  fieldWrap: { gap: 8 },
  label: { fontSize: 11, fontWeight: '800', color: '#848E9C', textTransform: 'uppercase', letterSpacing: 1.2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E2026', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#2B2F36' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: '#EAECEF' },
  eyeBtn: { padding: 6 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#2B2F36', backgroundColor: '#1E2026', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#F0B90B', borderColor: '#F0B90B' },
  termsText: { fontSize: 13, color: '#848E9C', flex: 1 },
  termsLink: { color: '#F0B90B', fontWeight: '600' },
  primaryBtn: { height: 56, borderRadius: 16, backgroundColor: '#F0B90B', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  disabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: '#0B0E11' },
  linkBtn: { alignItems: 'center', paddingVertical: 4 },
  linkText: { fontSize: 13, color: '#848E9C' },
  linkBold: { color: '#F0B90B', fontWeight: '700' },
});
