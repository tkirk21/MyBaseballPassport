//baseball//app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { PremiumProvider } from '@/context/PremiumContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { useTheme } from '@/context/ThemeContext';
import * as Application from 'expo-application';
import { Alert, Linking, Platform } from 'react-native';
import mobileAds from 'react-native-google-mobile-ads';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    mobileAds()
      .initialize()
      .then(() => {
        console.log('AdMob initialized');
      });
  }, []);

  useEffect(() => {
    const checkForUpdate = async () => {
      try {
        const response = await fetch(
          `https://raw.githubusercontent.com/tkirk21/mybaseballpassport-data/main/version.json?t=${Date.now()}`
        );
        const { minVersion } = await response.json();

        const currentVersion = Application.nativeApplicationVersion || '0.0.0';

        const isOlder = (current: string, required: string) => {
          const c = current.split('.').map(Number);
          const r = required.split('.').map(Number);
          for (let i = 0; i < r.length; i++) {
            if ((c[i] || 0) < r[i]) return true;
            if ((c[i] || 0) > r[i]) return false;
          }
          return false;
        };

        if (isOlder(currentVersion, minVersion)) {
          Alert.alert(
            'Update Required',
            'A new version of My Baseball Passport is available.\n\nPlease update the app from your App Store to continue.',
            [
              {
                text: 'Update',
                onPress: () =>
                  Linking.openURL(
                    Platform.OS === 'ios'
                      ? 'https://apps.apple.com/us/app/my-baseball-passport/id6760553713'
                      : 'https://play.google.com/store/apps/details?id=com.tkirk21.MyBaseballPassport'
                  ),
              },
            ],
            { cancelable: false }
          );
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    checkForUpdate();
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#0A2940');
  }, []);

  if (!loaded) return null;

  return (
    <ThemeProvider>
      <PremiumProvider>
        <NavigationThemeWrapper />
        <StatusBar style="light" backgroundColor="#0A2940" />
      </PremiumProvider>
    </ThemeProvider>
  );
}

// Separate component so we can use the hook inside the provider
function NavigationThemeWrapper() {
  const { effectiveScheme } = useTheme();

  return (
    <NavigationThemeProvider value={effectiveScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="checkin" options={{ headerShown: false }} />
        <Stack.Screen name="userprofile" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="arenas/[arenaId]" options={{ headerShown: false }} />
        <Stack.Screen name="leagues/[leagueName]" options={{ headerShown: false }} />
      </Stack>
    </NavigationThemeProvider>
  );
}