import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash screen once the app is ready
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="main" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="settings" options={{ 
          presentation: 'modal', 
          title: '设置',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#ffffff'
        }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}