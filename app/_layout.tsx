import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

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
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="online-play" options={{ headerShown: false }} />
        <Stack.Screen name="cpu-game" options={{ headerShown: false }} />

        <Stack.Screen name="private-room" options={{ headerShown: false }} />
        <Stack.Screen name="create-room" options={{ headerShown: false }} />
        <Stack.Screen name="join-room" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar hidden />
    </GestureHandlerRootView>
  );
}
