// app/index.tsx
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';



export default function Index() {
    const { isSignedIn, isLoaded } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoaded) return; // wait for Clerk to finish

        const t = setTimeout(() => {
            if (isSignedIn) {
                router.replace('/(tabs)/popular');
            } else {
                router.replace('/(auth)/welcome');
            }
        }, 1500);

        return () => clearTimeout(t);
    }, [isLoaded, isSignedIn]);

    return (
        <View style={styles.container}>

            <Animated.Text entering={FadeIn.duration(600)} style={styles.logo}>
                Ticksnap
            </Animated.Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5C400',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        fontSize: 36,
        fontWeight: '800',
        fontStyle: 'italic',
        color: '#111111',
        letterSpacing: -1,
    },
});