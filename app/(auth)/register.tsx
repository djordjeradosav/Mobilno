import { useSignUp } from '@clerk/clerk-expo';
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
import { syncUserToSupabase } from '../../lib/syncUser';

export default function Register() {
    const router = useRouter();
    const { signUp, setActive, isLoaded } = useSignUp();

    // Step 1 fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [loading, setLoading] = useState(false);

    // Step 2 verification
    const [pendingVerification, setPendingVerification] = useState(false);
    const [code, setCode] = useState('');
    const [verifyLoading, setVerifyLoading] = useState(false);

    const handleRegister = async () => {
        if (!isLoaded) return;
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
            await signUp.create({
                username: username.trim().toLowerCase(),
                emailAddress: email.trim().toLowerCase(),
                password,
            });
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            setPendingVerification(true);
        } catch (err: any) {
            const msg = err?.errors?.[0]?.longMessage ?? 'Registration failed. Please try again.';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!isLoaded) return;
        if (!code.trim()) {
            Alert.alert('Enter code', 'Please enter the verification code sent to your email.');
            return;
        }

        setVerifyLoading(true);
        try {
            const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });

            if (result.status === 'complete') {
                // Sync to Supabase
                if (result.createdUserId) {
                    await syncUserToSupabase(result.createdUserId, username.trim().toLowerCase(), email.trim().toLowerCase());
                }
                await setActive({ session: result.createdSessionId });
                router.replace('/(tabs)/popular');
            } else {
                Alert.alert('Verification failed', 'Please check the code and try again.');
            }
        } catch (err: any) {
            const msg = err?.errors?.[0]?.longMessage ?? 'Verification failed. Please try again.';
            Alert.alert('Error', msg);
        } finally {
            setVerifyLoading(false);
        }
    };

    if (pendingVerification) {
        return (
            <View style={styles.root}>
                <StatusBar style="dark" />
                <View style={styles.verifyContainer}>
                    <View style={styles.verifyIcon}>
                        <FontAwesome name="envelope-o" size={32} color="#F5C400" />
                    </View>
                    <Text style={styles.verifyTitle}>Check your email</Text>
                    <Text style={styles.verifySubtitle}>
                        We sent a 6-digit code to{'\n'}
                        <Text style={{ fontWeight: '700', color: '#1a1a1a' }}>{email}</Text>
                    </Text>

                    <View style={styles.codeWrap}>
                        <TextInput
                            style={styles.codeInput}
                            placeholder="000000"
                            placeholderTextColor="#ccc"
                            value={code}
                            onChangeText={setCode}
                            keyboardType="number-pad"
                            maxLength={6}
                            textAlign="center"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.verifyBtn, verifyLoading && styles.btnDisabled]}
                        onPress={handleVerify}
                        disabled={verifyLoading}
                        activeOpacity={0.85}
                    >
                        {verifyLoading ? (
                            <ActivityIndicator color="#F5C400" />
                        ) : (
                            <Text style={styles.verifyBtnText}>Verify Email</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setPendingVerification(false)}>
                        <Text style={styles.backLink}>← Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

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
                        <Text style={styles.label}>Phone (optional)</Text>
                        <View style={styles.inputWrap}>
                            <FontAwesome name="phone" size={16} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="+1 (555) 000-0000"
                                placeholderTextColor="#bbb"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
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
                                <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={16} color="#999" />
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
                            <ActivityIndicator color="#F5C400" />
                        ) : (
                            <Text style={styles.registerBtnText}>Create Account</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                        <Text style={styles.footerLink}>Sign in</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FAFAF8' },
    container: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 56,
        paddingBottom: 40,
    },
    back: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f0f0ee',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    header: { marginBottom: 36, gap: 6 },
    logo: {
        fontSize: 20,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#F5C400',
        marginBottom: 8,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: -0.5,
    },
    subtitle: { fontSize: 15, color: '#888', fontWeight: '500' },
    form: { gap: 18 },
    fieldGroup: { gap: 8 },
    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1a1a1a',
        letterSpacing: 0.3,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0ee',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 54,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    inputIcon: { marginRight: 12 },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '500',
    },
    eyeBtn: { padding: 4 },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginTop: 4,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#ddd',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    checkboxChecked: {
        backgroundColor: '#1a1a1a',
        borderColor: '#1a1a1a',
    },
    termsText: { flex: 1, fontSize: 13, color: '#666', lineHeight: 20 },
    termsLink: { color: '#1a1a1a', fontWeight: '700' },
    registerBtn: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 8,
    },
    btnDisabled: { opacity: 0.6 },
    registerBtnText: {
        color: '#F5C400',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 28,
    },
    footerText: { fontSize: 14, color: '#888' },
    footerLink: { fontSize: 14, color: '#1a1a1a', fontWeight: '700' },
    // Verify step
    verifyContainer: {
        flex: 1,
        paddingHorizontal: 32,
        paddingTop: 100,
        alignItems: 'center',
        gap: 16,
    },
    verifyIcon: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    verifyTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: -0.5,
    },
    verifySubtitle: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
    },
    codeWrap: { marginTop: 16, width: '100%' },
    codeInput: {
        backgroundColor: '#f0f0ee',
        borderRadius: 16,
        height: 64,
        fontSize: 28,
        fontWeight: '700',
        color: '#1a1a1a',
        letterSpacing: 12,
        borderWidth: 2,
        borderColor: '#F5C400',
    },
    verifyBtn: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        width: '100%',
        marginTop: 8,
    },
    verifyBtnText: {
        color: '#F5C400',
        fontSize: 16,
        fontWeight: '800',
    },
    backLink: {
        fontSize: 14,
        color: '#888',
        marginTop: 8,
        fontWeight: '600',
    },
});