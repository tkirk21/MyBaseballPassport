//baseball//index.tsx
import { Redirect, Stack } from 'expo-router';
import { onAuthStateChanged, getAuth, signOut } from 'firebase/auth';
import firebaseApp from '@/firebaseConfig';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useColorScheme } from '@/hooks/useColorScheme';

const auth = getAuth(firebaseApp);

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const colorScheme = useColorScheme();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        try {
          if (currentUser) {
            let stayLoggedIn: string | null = null;
            let activeLogin: string | null = null;

            try {
              stayLoggedIn = await AsyncStorage.getItem('stayLoggedIn');
              activeLogin = await AsyncStorage.getItem('activeLogin');
            } catch (error) {
              console.warn('AsyncStorage read failed');
            }

            if (activeLogin === 'true') {
              try {
                await AsyncStorage.removeItem('activeLogin');
              } catch (error) {
                console.warn('Failed removing activeLogin');
              }
              setUser(currentUser);
            } else if (stayLoggedIn === 'session') {
              try {
                await AsyncStorage.removeItem('userEmail');
                await AsyncStorage.removeItem('stayLoggedIn');
              } catch (error) {
                console.warn('Failed clearing session storage');
              }

              try {
                await signOut(auth);
              } catch (error) {
                console.warn('Firebase signOut failed');
              }

              try {
                await GoogleSignin.signOut();
              } catch (error) {
                console.warn('Google signOut failed');
              }

              setUser(null);
            } else {
              setUser(currentUser);
            }
          } else {
            setUser(null);
          }
        } catch (error) {
          console.warn('Auth state handling failed');
          setUser(null);
        } finally {
          setLoading(false);
        }
      });
    } catch (error) {
      console.warn('Failed to initialize auth listener');
      setUser(null);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.loadingContainer, { backgroundColor: colorScheme === 'dark' ? '#0D131F' : '#F5F1E6' }]}>
          <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42'} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {user ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
});