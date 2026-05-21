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
    useColorScheme as useRNColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function Settings() {
    const router = useRouter();
    const { user } = useAuth();
    const systemColorScheme = useRNColorScheme();
    
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
        <SafeAreaView style={s.root} edges={['top']}>
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                    <FontAwesome name="arrow-left" size={16} color="#848E9C" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {/* Theme Section */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Appearance</Text>
                    <View style={s.settingRow}>
                        <View style={s.settingInfo}>
                            <FontAwesome name="moon-o" size={18} color="#F0B90B" style={s.settingIcon} />
                            <Text style={s.settingLabel}>Theme</Text>
                        </View>
                        <TouchableOpacity style={s.themeToggle}>
                            <Text style={s.themeText}>System ({systemColorScheme})</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={s.helperText}>Theme switching is currently following your system settings.</Text>
                </View>

                <View style={s.divider} />

                {/* Password Reset Section */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Security</Text>
                    <Text style={s.subTitle}>Change Password</Text>
                    
                    <View style={s.fieldWrap}>
                        <View style={s.inputRow}>
                            <FontAwesome name="lock" size={15} color="#848E9C" style={s.inputIcon} />
                            <TextInput
                                style={s.input}
                                placeholder="New Password"
                                placeholderTextColor="#474D57"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                                <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={15} color="#848E9C" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={s.fieldWrap}>
                        <View style={s.inputRow}>
                            <FontAwesome name="lock" size={15} color="#848E9C" style={s.inputIcon} />
                            <TextInput
                                style={s.input}
                                placeholder="Confirm New Password"
                                placeholderTextColor="#474D57"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[s.primaryBtn, loading && s.disabled]} 
                        onPress={handleResetPassword}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#0B0E11" /> : <Text style={s.primaryBtnText}>Update Password</Text>}
                    </TouchableOpacity>
                </View>

                <View style={s.divider} />

                {/* Account Info */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Account</Text>
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Email</Text>
                        <Text style={s.infoValue}>{user?.email}</Text>
                    </View>
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>User ID</Text>
                        <Text style={s.infoValue} numberOfLines={1}>{user?.id}</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0B0E11' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#1E2026',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#2B2F36',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#EAECEF' },
    scroll: { paddingHorizontal: 20, paddingBottom: 40 },
    section: { marginTop: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#F0B90B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    subTitle: { fontSize: 15, fontWeight: '700', color: '#EAECEF', marginBottom: 12 },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1E2026',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2B2F36',
    },
    settingInfo: { flexDirection: 'row', alignItems: 'center' },
    settingIcon: { marginRight: 12 },
    settingLabel: { fontSize: 15, fontWeight: '600', color: '#EAECEF' },
    themeToggle: {
        backgroundColor: '#2B2F36',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    themeText: { fontSize: 12, fontWeight: '700', color: '#848E9C' },
    helperText: { fontSize: 12, color: '#848E9C', marginTop: 8, fontStyle: 'italic' },
    divider: { height: 1, backgroundColor: '#1E2026', marginTop: 32 },
    fieldWrap: { marginBottom: 12 },
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
        marginTop: 8,
    },
    disabled: { opacity: 0.6 },
    primaryBtnText: { fontSize: 15, fontWeight: '900', color: '#0B0E11' },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoLabel: { fontSize: 14, color: '#848E9C' },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#EAECEF', flex: 1, textAlign: 'right', marginLeft: 20 },
});
