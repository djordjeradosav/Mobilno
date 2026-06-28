import { useAuth } from '@/lib/auth';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/components/ThemeContext';
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
    const { colorScheme } = useTheme();
    const C = Colors[colorScheme];
    const inactiveColor = C.iconDefault;

    return (
        <View style={tabStyles.wrap}>
            {materialIcon ? (
                <MaterialIcons
                    name={materialIcon as any}
                    size={22}
                    color={focused ? C.accent : inactiveColor}
                />
            ) : (
                <FontAwesome
                    name={iconName as any}
                    size={20}
                    color={focused ? C.accent : inactiveColor}
                />
            )}
            <Text style={[
                tabStyles.label, 
                { color: inactiveColor },
                focused && { color: C.accent }
            ]}>
                {label}
            </Text>
        </View>
    );
}

const tabStyles = StyleSheet.create({
    wrap: { alignItems: 'center', gap: 4, paddingTop: 6, paddingBottom: 2 },
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
});

export default function TabsLayout() {
    const { user, isLoaded } = useAuth();
    const { colorScheme } = useTheme();
    const C = Colors[colorScheme];

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
                    backgroundColor: C.card,
                    borderTopWidth: 1,
                    borderTopColor: C.border,
                    height: 72,
                    paddingBottom: 10,
                    paddingTop: 6,
                    elevation: 20,
                    shadowColor: C.text,
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 16,
                },
                tabBarActiveTintColor: C.accent,
                tabBarInactiveTintColor: C.iconDefault,
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
                                { backgroundColor: C.accent },
                                focused && { backgroundColor: '#D4A017' }
                            ]}>
                                <FontAwesome name="plus" size={18} color={C.textInverse} />
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
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
});