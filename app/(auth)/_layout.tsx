import { useAuth } from '@/lib/auth';
import { Redirect, Stack } from 'expo-router';

export default function AuthLayout() {
    const { user, isLoaded } = useAuth();

    if (!isLoaded) return null;

    if (user) {
        return <Redirect href="/(tabs)/popular" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="welcome" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
        </Stack>
    );
}