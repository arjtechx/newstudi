import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthContext } from '../../lib/auth-provider';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'admin';
  const insets = useSafeAreaInsets();

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#3b82f6',
      tabBarInactiveTintColor: '#cbd5e1',
      tabBarStyle: {
        height: Platform.OS === 'ios' ? 88 + insets.bottom : 70 + insets.bottom,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
        paddingTop: 10,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      tabBarLabelStyle: { 
        fontSize: 10, 
        fontWeight: '900', 
        textTransform: 'uppercase',
      },
      headerShown: false,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'QG',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "flash" : "flash-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={26} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="questions"
        options={{
          title: 'Alvos',
          tabBarIcon: ({ color, focused }) => (
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: focused ? '#3b82f6' : '#f8fafc',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: Platform.OS === 'ios' ? 0 : 5,
              borderWidth: 2,
              borderColor: focused ? '#3b82f6' : '#e2e8f0',
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: focused ? 0.3 : 0,
              shadowRadius: 8,
              elevation: focused ? 4 : 0,
            }}>
              <MaterialCommunityIcons 
                name={focused ? "target" : "target-variant"} 
                size={28} 
                color={focused ? '#fff' : '#94a3b8'} 
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="games"
        options={{
          title: 'Treino',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "game-controller" : "game-controller-outline"} size={26} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Comando',
          href: isAdmin ? '/admin' : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "terminal" : "terminal-outline"} size={26} color={color} />
          ),
        }}
      />

      {/* Escondendo abas de sistema */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Operador',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
