import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';

export default function AuthLayout() {
    const { isSignedIn, isLoaded } = useAuth();

    // FIX: must wait for Clerk to load before redirecting
    // Without this, isSignedIn is undefined on cold start → flashes welcome screen for logged-in users
    if (!isLoaded) return null;

    if (isSignedIn) {
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
