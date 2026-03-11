import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { colors, radius } from '../theme';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/home/HomeScreen';
import MatchDetailScreen from '../screens/home/MatchDetailScreen';
import CreateMatchScreen from '../screens/matches/CreateMatchScreen';
import SocialScreen from '../screens/social/SocialScreen';
import PlayerProfileScreen from '../screens/social/PlayerProfileScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.header },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700', color: colors.text },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="HomeMain" component={HomeScreen} options={{ title: '🎾 Partidos' }} />
      <Stack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ title: 'Detalle del partido' }} />
    </Stack.Navigator>
  );
}

function SocialStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="SocialMain" component={SocialScreen} options={{ title: '👥 Social' }} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} options={{ title: 'Perfil' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.partnerName || 'Chat' })} />
    </Stack.Navigator>
  );
}

function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="MessagesMain" component={MessagesScreen} options={{ title: '💬 Mensajes' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={({ route }) => ({ title: route.params?.partnerName || 'Chat' })} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Editar perfil' }} />
    </Stack.Navigator>
  );
}

function TabIcon({ emoji, label, focused }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎾" label="Inicio" focused={focused} />,
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen
        name="Crear"
        component={CreateMatchScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
              alignItems: 'center', justifyContent: 'center', marginBottom: 4,
              shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
            }}>
              <Text style={{ fontSize: 24, color: colors.white }}>+</Text>
            </View>
          ),
          tabBarLabel: 'Crear',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" label="Social" focused={focused} />,
          tabBarLabel: 'Social',
        }}
      />
      <Tab.Screen
        name="Mensajes"
        component={MessagesStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label="Mensajes" focused={focused} />,
          tabBarLabel: 'Mensajes',
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Perfil" focused={focused} />,
          tabBarLabel: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
