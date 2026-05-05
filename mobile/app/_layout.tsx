import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef } from 'react';
import { View, Animated, StyleSheet, Image, Dimensions, Text, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Updates from 'expo-updates';
import 'react-native-reanimated';

WebBrowser.maybeCompleteAuthSession();

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuthContext } from '../lib/auth-provider';

const { width } = Dimensions.get('window');

function AnimatedSplashScreen({ onFinish }: { onFinish: () => void }) {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const [updateStatus, setUpdateStatus] = useState('Verificando integridade...');

  const runUpdateCheck = async () => {
    if (__DEV__) return;
    try {
      setUpdateStatus('Sincronizando com a base...');
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateStatus('Baixando melhorias táticas...');
        await Updates.fetchUpdateAsync();
        setUpdateStatus('Atualização concluída!');
        await Updates.reloadAsync();
      } else {
        setUpdateStatus('Sistema atualizado.');
      }
    } catch (e) {
      setUpdateStatus('Conectado.');
    }
  };

  useEffect(() => {
    runUpdateCheck();

    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: containerOpacity }]}>
      <Animated.View style={{ 
        transform: [{ scale: logoScale }], 
        opacity: logoOpacity,
        alignItems: 'center' 
      }}>
        <Image 
          source={require('../assets/images/icon.png')} 
          style={styles.splashLogo} 
          resizeMode="contain"
        />
        <Animated.View style={{ opacity: textOpacity, marginTop: 20, alignItems: 'center' }}>
          <Text style={styles.splashTitle}>
            APROVA<Text style={styles.splashTitleBold}>CONCURSOS</Text>
          </Text>
          <View style={styles.updateRow}>
            <ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 8 }} />
            <Text style={styles.updateText}>{updateStatus.toUpperCase()}</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function RootLayoutNav({ splashFinished }: { splashFinished: boolean }) {
  const { user, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Só navega se o Splash já acabou e o Auth já carregou
    if (!splashFinished || loading) return;

    const isLoginPage = segments[0] === 'login' || segments[segments.length - 1] === 'login';
    
    if (!user && !isLoginPage) {
      router.replace('/login');
    } else if (user && isLoginPage) {
      // Se já está logado, vai para o QG
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, splashFinished]);

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [splashFinished, setSplashFinished] = useState(false);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
          <RootLayoutNav splashFinished={splashFinished} />
          {!splashFinished && (
            <AnimatedSplashScreen onFinish={() => setSplashFinished(true)} />
          )}
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  splashLogo: {
    width: 140,
    height: 140,
    borderRadius: 32,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '400',
    color: '#3b82f6',
    letterSpacing: -1,
  },
  splashTitleBold: {
    fontWeight: '900',
    color: '#0f172a',
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  updateText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1.5,
  },
});
