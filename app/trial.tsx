//baseball/trial.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useColorScheme } from '../hooks/useColorScheme';

export default function TrialScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();

  const styles = StyleSheet.create({
    bullet: { fontSize: 18, marginBottom: 8, textAlign: 'center', color: colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42', },
    buttonPrimary: { backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#E0E7FF', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, borderWidth: 2, borderColor: colorScheme === 'dark' ? '#666666' : '#2F4F68', width: '70%', alignSelf: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: colorScheme === 'dark' ? 0.5 : 0.2, shadowRadius: 4, elevation: 6, },
    buttonText: { color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', fontSize: 18, fontWeight: '600', },
    footer: { fontSize: 16, marginTop: 20, marginBottom: 40, textAlign: 'center', color: colorScheme === 'dark' ? '#BBBBBB' : '#2F4F68', },
    screenBackground: { flex: 1, backgroundColor: colorScheme === 'dark' ? '#0A1420' : '#FFFFFF', justifyContent: 'center', padding: 24, },
    text: { fontSize: 18,  marginBottom: 10, textAlign: 'center', color: colorScheme === 'dark' ? '#CCCCCC' : '#374151', },
    title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42', },
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.screenBackground}>
        <Text style={styles.title}>Welcome to My Baseball Passport</Text>

        <Text style={styles.text}>Your free access includes:</Text>

        <Text style={styles.bullet}>• Full access to all premium features</Text>
        <Text style={styles.bullet}>• Up to 3 ballpark check-ins</Text>
        <Text style={styles.bullet}>• 3 days of full premium access</Text>

        <Text style={styles.footer}>
          After 3 days, continue with free access or upgrade to premium for $1.99 per month or $19.99 per year. Subscription renews automatically until cancelled.
        </Text>

        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.buttonText}>Start Exploring</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}