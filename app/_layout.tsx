import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    const hideNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('inset-touch');
          console.log('[NAVBAR] System navigation bar hidden programmatically');
        } catch (error) {
          console.warn('[NAVBAR] Failed to hide navigation bar:', error);
        }
      }
    };

    hideNavigationBar();

    // Listen for orientation changes and re-hide navigation bar
    const orientationSubscription = ScreenOrientation.addOrientationChangeListener(() => {
      console.log('[NAVBAR] Orientation changed, re-hiding navigation bar');
      hideNavigationBar();
    });

    return () => {
      orientationSubscription.remove();
    };
  }, []);

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="multiplayer" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar hidden />
    </>
  );
}
