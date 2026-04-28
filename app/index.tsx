import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const { user, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const t = setTimeout(() => {
      router.replace(user ? '/(tabs)/popular' : '/(auth)/welcome' as any);
    }, 1500);
    return () => clearTimeout(t);
  }, [isLoaded, user]);

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