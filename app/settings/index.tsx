import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function Settings() {
    const router = useRouter();
    const { user } = useAuth();
    const { theme, setTheme, colorScheme } = useTheme();
    const C = Colors[colorScheme];
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleResetPassword = async () => {
        if (!newPassword) {
            Alert.alert('Error', 'Please enter a new password.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            Alert.alert('Success', 'Your password has been updated successfully.');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[s.root, { backgroundColor: C.background }]} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity 
                    style={[s.backBtn, { backgroundColor: C.surface, borderColor: C.border }]} 
                    onPress={() => router.back()}
                >
                    <FontAwesome name="arrow-left" size={16} color={C.iconDefault} />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { color: C.text }]}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {/* Theme Section */}
                <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: C.accent }]}>Appearance</Text>
                    <View style={[s.settingRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                        <View style={s.settingInfo}>
                            <FontAwesome 
                                name={colorScheme === 'dark' ? "moon-o" : "sun-o"} 
                                size={18} 
                                color={C.accent} 
                                style={s.settingIcon} 
                            />
                            <Text style={[s.settingLabel, { color: C.text }]}>Theme</Text>
                        </View>
                        <TouchableOpacity 
                            style={[s.themeToggle, { backgroundColor: C.border }]}
                            onPress={() => {
                                if (theme === 'system') setTheme('light');
                                else if (theme === 'light') setTheme('dark');
                                else setTheme('system');
                            }}
                        >
                            <Text style={[s.themeText, { color: C.textMuted }]}>
                                {theme.charAt(0).toUpperCase() + theme.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={[s.helperText, { color: C.textMuted }]}>Tap to switch between Light, Dark, and System theme.</Text>
                </View>

                <View style={[s.divider, { backgroundColor: C.border }]} />

                {/* Password Reset Section */}
                <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: C.accent }]}>Security</Text>
                    <Text style={[s.subTitle, { color: C.text }]}>Change Password</Text>
                    
                    <View style={s.fieldWrap}>
                        <View style={[s.inputRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                            <FontAwesome name="lock" size={15} color={C.iconDefault} style={s.inputIcon} />
                            <TextInput
                                style={[s.input, { color: C.text }]}
                                placeholder="New Password"
                                placeholderTextColor={C.placeholder}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                                <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={15} color={C.iconDefault} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={s.fieldWrap}>
                        <View style={[s.inputRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                            <FontAwesome name="lock" size={15} color={C.iconDefault} style={s.inputIcon} />
                            <TextInput
                                style={[s.input, { color: C.text }]}
                                placeholder="Confirm New Password"
                                placeholderTextColor={C.placeholder}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[s.primaryBtn, { backgroundColor: C.accent }, loading && s.disabled]} 
                        onPress={handleResetPassword}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color={C.textInverse} /> : <Text style={[s.primaryBtnText, { color: C.textInverse }]}>Update Password</Text>}
                    </TouchableOpacity>
                </View>

                <View style={[s.divider, { backgroundColor: C.border }]} />

                {/* Account Info */}
                <View style={s.section}>
                    <Text style={[s.sectionTitle, { color: C.accent }]}>Account</Text>
                    <View style={s.infoRow}>
                        <Text style={[s.infoLabel, { color: C.textMuted }]}>Email</Text>
                        <Text style={[s.infoValue, { color: C.text }]}>{user?.email}</Text>
                    </View>
                    <View style={s.infoRow}>
                        <Text style={[s.infoLabel, { color: C.textMuted }]}>User ID</Text>
                        <Text style={[s.infoValue, { color: C.text }]} numberOfLines={1}>{user?.id}</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    scroll: { paddingHorizontal: 20, paddingBottom: 40 },
    section: { marginTop: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    subTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    settingInfo: { flexDirection: 'row', alignItems: 'center' },
    settingIcon: { marginRight: 12 },
    settingLabel: { fontSize: 15, fontWeight: '600' },
    themeToggle: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    themeText: { fontSize: 12, fontWeight: '700' },
    helperText: { fontSize: 12, marginTop: 8, fontStyle: 'italic' },
    divider: { height: 1, marginTop: 32 },
    fieldWrap: { marginBottom: 12 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 16, height: 56,
        borderWidth: 1,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 15, fontWeight: '600' },
    eyeBtn: { padding: 6 },
    primaryBtn: {
        height: 56, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        marginTop: 8,
    },
    disabled: { opacity: 0.6 },
    primaryBtnText: { fontSize: 15, fontWeight: '900' },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoLabel: { fontSize: 14 },
    infoValue: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 20 },
});
