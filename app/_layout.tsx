import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SoundProvider } from '../hooks/useSoundContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    console.log('[SafeAreaDebug] Root layout mounted');
    
    const setupNavigationBar = async () => {
      if (Platform.OS === 'android') {
        console.log('[SafeAreaDebug] Setting up navigation bar for Android');
        // Only set visibility - behavior control not supported with edge-to-edge
        try {
          await NavigationBar.setVisibilityAsync('hidden');
          console.log('[SafeAreaDebug] Navigation bar hidden');
        } catch (error: any) {
          console.log('[SafeAreaDebug] Error hiding nav bar:', error?.message);
        }
      } else {
        console.log('[SafeAreaDebug] Not Android, skipping navigation bar setup');
      }
    };

    setupNavigationBar();

    // Listen for orientation changes and re-setup navigation bar
    const orientationSubscription = ScreenOrientation.addOrientationChangeListener(() => {
      setupNavigationBar();
    });

    return () => {
      orientationSubscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SoundProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="leaderboards" />
            <Stack.Screen name="online-play" />
            <Stack.Screen name="cpu-game" />

            <Stack.Screen name="private-room" />
            <Stack.Screen name="create-room" />
            <Stack.Screen name="join-room" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar hidden />
        </SoundProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
