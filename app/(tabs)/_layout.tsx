import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

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
    const colorScheme = useColorScheme();
    const inactiveColor = colorScheme === 'dark' ? '#474D57' : '#999';

    return (
        <View style={tabStyles.wrap}>
            {materialIcon ? (
                <MaterialIcons
                    name={materialIcon as any}
                    size={22}
                    color={focused ? '#F0B90B' : inactiveColor}
                />
            ) : (
                <FontAwesome
                    name={iconName as any}
                    size={20}
                    color={focused ? '#F0B90B' : inactiveColor}
                />
            )}
            <Text style={[
                tabStyles.label, 
                { color: inactiveColor },
                focused && tabStyles.labelActive
            ]}>
                {label}
            </Text>
        </View>
    );
}

const tabStyles = StyleSheet.create({
    wrap: { alignItems: 'center', gap: 4, paddingTop: 6, paddingBottom: 2 },
    label: { fontSize: 10, fontWeight: '700', color: '#474D57', letterSpacing: 0.3 },
    labelActive: { color: '#F0B90B' },
});

export default function TabsLayout() {
    const { user, isLoaded } = useAuth();
    const colorScheme = useColorScheme();

    if (!isLoaded) return null;

    if (!user) {
        return <Redirect href="/(auth)/welcome" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: colorScheme === 'dark' ? '#161A1E' : '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: colorScheme === 'dark' ? '#2B2F36' : '#E0E0E0',
                    height: 72,
                    paddingBottom: 10,
                    paddingTop: 6,
                    elevation: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: colorScheme === 'dark' ? 0.5 : 0.1,
                    shadowRadius: 16,
                },
                tabBarActiveTintColor: '#F0B90B',
                tabBarInactiveTintColor: colorScheme === 'dark' ? '#474D57' : '#999',
            }}
        >
            <Tabs.Screen
                name="popular"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon iconName="fire" label="Feed" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <TabIcon iconName="search" label="Explore" focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="forecast"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <View style={tabStyles.wrap}>
                            <View style={[
                                postBtnStyle.btn,
                                focused && postBtnStyle.btnActive
                            ]}>
                                <FontAwesome name="plus" size={18} color="#0B0E11" />
                            </View>
                        </View>
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
                }}
            />
        </Tabs>
    );
}

const postBtnStyle = StyleSheet.create({
    btn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F0B90B',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    btnActive: {
        backgroundColor: '#D4A017',
    },
});