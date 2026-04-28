import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';

export default function AuthLayout() {
    const { isSignedIn } = useAuth();
    console.log('isSignedIn', isSignedIn);
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