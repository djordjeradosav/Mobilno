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
import { useTheme } from '@/components/ThemeContext';
import Colors from '@/constants/Colors';

const Field = ({ label, icon, value, onChange, placeholder, secure, keyboard, toggleSecure, C }: any) => (
  <View style={s.fieldWrap}>
    <Text style={[s.label, { color: C.textMuted }]}>{label}</Text>
    <View style={[s.inputRow, { backgroundColor: C.inputBackground, borderColor: C.border }]}>
      <FontAwesome name={icon} size={15} color={C.iconDefault} style={s.inputIcon} />
      <TextInput
        style={[s.input, { color: C.text }]}
        placeholder={placeholder}
        placeholderTextColor={C.placeholder}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        secureTextEntry={secure}
        keyboardType={keyboard}
      />
      {toggleSecure && (
        <TouchableOpacity onPress={toggleSecure} style={s.eyeBtn}>
          <FontAwesome name={secure ? 'eye' : 'eye-slash'} size={15} color={C.iconDefault} />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export default function Register() {
  const router = useRouter();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
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
    <KeyboardAvoidingView style={[s.root, { backgroundColor: C.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={[s.backBtn, { backgroundColor: C.surface, borderColor: C.border }]} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={16} color={C.iconDefault} />
        </TouchableOpacity>
        <Text style={[s.brand, { color: C.accent }]}>Ticksnap</Text>
        <Text style={[s.title, { color: C.text }]}>Create account</Text>
        <View style={s.form}>
          <Field label="Username" icon="at" value={form.username} onChange={(v: string) => updateForm('username', v)} placeholder="trader" C={C} />
          <Field label="Email" icon="envelope-o" value={form.email} onChange={(v: string) => updateForm('email', v)} placeholder="you@email.com" keyboard="email-address" C={C} />
          <Field label="Password" icon="lock" value={form.password} onChange={(v: string) => updateForm('password', v)} placeholder="Min. 8 chars" secure={!showPassword} toggleSecure={() => setShowPassword(!showPassword)} C={C} />
          <TouchableOpacity style={s.termsRow} onPress={() => setAgreeTerms(!agreeTerms)}>
            <View style={[s.checkbox, { borderColor: C.border, backgroundColor: C.surface }, agreeTerms && { backgroundColor: C.accent, borderColor: C.accent }]}>
              {agreeTerms && <FontAwesome name="check" size={10} color={C.textInverse} />}
            </View>
            <Text style={[s.termsText, { color: C.textMuted }]}>I agree to the <Text style={[s.termsLink, { color: C.accent }]}>Terms & Policy</Text></Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.primaryBtn, loading && s.disabled]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color={C.textInverse} /> : <Text style={[s.primaryBtnText, { color: C.textInverse }]}>Create Account →</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={s.linkBtn}>
            <Text style={[s.linkText, { color: C.textMuted }]}>Already have an account? <Text style={[s.linkBold, { color: C.accent }]}>Log In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 32 },
  brand: { fontSize: 17, fontWeight: '900', fontStyle: 'italic', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 32 },
  form: { gap: 16 },
  fieldWrap: { gap: 8 },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '600' },
  eyeBtn: { padding: 6 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  termsText: { fontSize: 13, flex: 1 },
  termsLink: { fontWeight: '600' },
  primaryBtn: { height: 56, borderRadius: 16, backgroundColor: '#F0B90B', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  disabled: { opacity: 0.6 },
  primaryBtnText: { fontSize: 15, fontWeight: '900' },
  linkBtn: { alignItems: 'center', paddingVertical: 4 },
  linkText: { fontSize: 13 },
  linkBold: { fontWeight: '700' },
});
