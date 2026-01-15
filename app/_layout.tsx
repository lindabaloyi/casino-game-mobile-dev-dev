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
    const hideNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('inset-touch');
        } catch {
        }
      }
    };

    hideNavigationBar();

    // Listen for orientation changes and re-hide navigation bar
    const orientationSubscription = ScreenOrientation.addOrientationChangeListener(() => {
      hideNavigationBar();
    });

    return () => {
      orientationSubscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="multiplayer" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar hidden />
    </GestureHandlerRootView>
  );
}
