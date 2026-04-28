import { useSignIn } from '@clerk/clerk-expo';
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

export default function Login() {
    const router = useRouter();
    const { signIn, setActive, isLoaded } = useSignIn();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!isLoaded) return;
        if (!username.trim() || !password.trim()) {
            Alert.alert('Missing fields', 'Please enter your username and password.');
            return;
        }

        setLoading(true);
        try {
            const result = await signIn.create({
                identifier: username.trim().toLowerCase(),
                password,
            });

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                router.replace('/(tabs)/popular');
            } else {
                Alert.alert('Sign in failed', 'Please check your credentials and try again.');
            }
        } catch (err: any) {
            const msg = err?.errors?.[0]?.longMessage ?? 'An error occurred. Please try again.';
            Alert.alert('Error', msg);
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
                {/* Back */}
                <TouchableOpacity style={styles.back} onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={18} color="#1a1a1a" />
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>Ticksnap</Text>
                    <Text style={styles.title}>Welcome back</Text>
                    <Text style={styles.subtitle}>Sign in to your account</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Username</Text>
                        <View style={styles.inputWrap}>
                            <FontAwesome name="user" size={16} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="your_username"
                                placeholderTextColor="#bbb"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                            />
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputWrap}>
                            <FontAwesome name="lock" size={16} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="••••••••"
                                placeholderTextColor="#bbb"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                returnKeyType="done"
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeBtn}
                            >
                                <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={16} color="#999" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.forgotBtn}>
                        <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#F5C400" />
                        ) : (
                            <Text style={styles.loginBtnText}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                        <Text style={styles.footerLink}>Create one</Text>
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
    header: {
        marginBottom: 40,
        gap: 6,
    },
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
    subtitle: {
        fontSize: 15,
        color: '#888',
        fontWeight: '500',
    },
    form: {
        flex: 1,
        gap: 20,
    },
    fieldGroup: {
        gap: 8,
    },
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
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '500',
    },
    eyeBtn: {
        padding: 4,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginTop: -8,
    },
    forgotText: {
        fontSize: 13,
        color: '#888',
        fontWeight: '600',
    },
    loginBtn: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 8,
    },
    loginBtnDisabled: {
        opacity: 0.6,
    },
    loginBtnText: {
        color: '#F5C400',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 14,
        color: '#888',
    },
    footerLink: {
        fontSize: 14,
        color: '#1a1a1a',
        fontWeight: '700',
    },
});