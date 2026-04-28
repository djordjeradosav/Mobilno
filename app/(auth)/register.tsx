import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { supabase } from '@/lib/supabase';

export default function Register() {
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!username.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Missing fields', 'Please fill in username, email, and password.');
            return;
        }
        if (!agreeTerms) {
            Alert.alert('Terms required', 'Please agree to the Terms & Privacy Policy.');
            return;
        }

        setLoading(true);
        try {
            console.log('Attempting Supabase Auth sign up for:', email.trim().toLowerCase());

            // We pass the username in options.data so the Database Trigger can pick it up
            const { data, error: authError } = await supabase.auth.signUp({
                email: email.trim().toLowerCase(),
                password,
                options: {
                    data: {
                        username: username.trim().toLowerCase(),
                    }
                }
            });

            if (authError) {
                console.error('Supabase Auth Error:', authError);
                throw new Error(authError.message);
            }

            if (!data.user) {
                throw new Error('No user data returned from Supabase Auth.');
            }

            console.log('User created successfully:', data.user.id);

            Alert.alert(
                'Success',
                'Account created! Please check your email for a verification link.',
                [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
            );

        } catch (err: any) {
            console.error('Registration process failed:', err);
            Alert.alert('Registration Failed', err.message ?? 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <TouchableOpacity style={styles.back} onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={18} color="#1a1a1a" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.logo}>Ticksnap</Text>
                    <Text style={styles.title}>Create account</Text>
                    <Text style={styles.subtitle}>Join thousands of elite traders</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Username</Text>
                        <View style={styles.inputWrap}>
                            <FontAwesome name="at" size={16} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="trader_name"
                                placeholderTextColor="#bbb"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputWrap}>
                            <FontAwesome name="envelope-o" size={16} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="you@email.com"
                                placeholderTextColor="#bbb"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrap}>
                            <FontAwesome name="lock" size={16} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Min. 8 characters"
                                placeholderTextColor="#bbb"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeBtn}
                            >
                                <FontAwesome
                                    name={showPassword ? 'eye-slash' : 'eye'}
                                    size={16}
                                    color="#999"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.termsRow}
                        onPress={() => setAgreeTerms(!agreeTerms)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                            {agreeTerms && <FontAwesome name="check" size={12} color="#fff" />}
                        </View>
                        <Text style={styles.termsText}>
                            I agree to the{' '}
                            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                            <Text style={styles.termsLink}>Privacy Policy</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.registerBtn, loading && styles.btnDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#111" />
                        ) : (
                            <Text style={styles.registerBtnText}>Create Account →</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                        <Text style={styles.loginLink}>
                            Already have an account? <Text style={{ fontWeight: '700', color: '#1a1a1a' }}>Login</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    container: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
    back: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
    header: { marginBottom: 40 },
    logo: { fontSize: 18, fontWeight: '800', color: '#F5C400', marginBottom: 8 },
    title: { fontSize: 32, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#666' },
    form: { gap: 20 },
    fieldGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 16, height: 56 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#1a1a1a' },
    eyeBtn: { padding: 8 },
    termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { backgroundColor: '#F5C400', borderColor: '#F5C400' },
    termsText: { fontSize: 14, color: '#666', flex: 1 },
    termsLink: { color: '#1a1a1a', fontWeight: '600' },
    registerBtn: { backgroundColor: '#F5C400', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
    btnDisabled: { opacity: 0.6 },
    registerBtnText: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    loginLink: { textAlign: 'center', marginTop: 24, fontSize: 14, color: '#666' },
});