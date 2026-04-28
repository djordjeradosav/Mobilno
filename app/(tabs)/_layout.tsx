import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

function TabIcon({
    label,
    focused,
    iconName,
    materialIcon,
}: {
    label: string;
    focused: boolean;
    iconName?: string;
    materialIcon?: string;
}) {
    return (
        <View style={tabStyles.wrap}>
            {materialIcon ? (
                <MaterialIcons
                    name={materialIcon as any}
                    size={22}
                    color={focused ? '#F5C400' : '#999'}
                />
            ) : (
                <FontAwesome
                    name={iconName as any}
                    size={20}
                    color={focused ? '#F5C400' : '#999'}
                />
            )}
            <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>
                {label}
            </Text>
        </View>
    );
}

const tabStyles = StyleSheet.create({
    wrap: { alignItems: 'center', gap: 4, paddingTop: 6, paddingBottom: 2 },
    label: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.3 },
    labelActive: { color: '#F5C400' },
});

export default function TabsLayout() {
    const { user, isLoaded } = useAuth();

    if (!isLoaded) return null;

    if (!user) {
        return <Redirect href="/(auth)/welcome" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarItemStyle: { justifyContent: 'center', alignItems: 'center' },
                tabBarStyle: {
                    backgroundColor: '#1a1a1a',
                    borderTopWidth: 1,
                    borderTopColor: '#2a2a2a',
                    height: 76,
                    paddingBottom: 12,
                    paddingTop: 8,
                    elevation: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                },
                tabBarActiveTintColor: '#F5C400',
                tabBarInactiveTintColor: '#999',
            }}
        >
            <Tabs.Screen
                name="popular"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon iconName="fire" label="Popular" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon iconName="search" label="Search" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="forecast"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon materialIcon="trending-up" label="Forecast" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="macro"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon materialIcon="bar-chart" label="Macro" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon iconName="user-circle" label="Profile" focused={focused} />
                    ),
                    tabBarItemStyle: { flex: 1, justifyContent: 'center' },
                }}
            />
        </Tabs>
    );
}