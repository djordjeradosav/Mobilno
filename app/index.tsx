import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const t = setTimeout(() => {
      router.replace(isSignedIn ? '/(tabs)/popular' : '/(auth)/welcome');
    }, 1500);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn]);

  return (
    <View style={s.container}>
      <Text style={s.logo}>Ticksnap</Text>
    </View>
  );
}

const s = StyleSheet.create({
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
