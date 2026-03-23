import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SoundProvider } from '../hooks/useSoundContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    const setupNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          // Allow back button gestures to work - use overlay-swipe behavior
          await NavigationBar.setBehaviorAsync('overlay-swipe');
        } catch {
          // Fallback to inset-touch
          try {
            await NavigationBar.setBehaviorAsync('inset-touch');
          } catch {
            // Ignore
          }
        }
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
    </GestureHandlerRootView>
  );
}
