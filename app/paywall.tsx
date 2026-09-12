//baseball//paywall.tsx
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '../hooks/useColorScheme';
import Purchases from 'react-native-purchases';
import { useState } from 'react';

export default function Paywall() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(false);
  const handleSubscribe = async () => {
    try {
      setLoading(true);

      const offerings = await Purchases.getOfferings();

      if (!offerings.current || offerings.current.availablePackages.length === 0) {
        setLoading(false);
        return;
      }

      const pkg = offerings.current.availablePackages[0];
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasPremium =
        customerInfo.entitlements.active['MY_BASEBALL_PASSPORT_PRO'] !== undefined;

      if (hasPremium) {
        router.replace('/(tabs)');
        return;
      }

      setLoading(false);

    } catch (e: any) {
      setLoading(false);

      if (e?.userCancelled) {
        return;
      }
    }
  };

  const styles = StyleSheet.create({
    bullet: { fontSize: 18, marginBottom: 8, textAlign: 'center', color: colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42', },
    buttonPrimary: { backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#E0E7FF', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, borderWidth: 2, borderColor: colorScheme === 'dark' ? '#666666' : '#2F4F68', width: '70%', alignSelf: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: colorScheme === 'dark' ? 0.5 : 0.2, shadowRadius: 4, elevation: 6, marginBottom: 14, },
    buttonSecondary: { borderWidth: 2, borderColor: colorScheme === 'dark' ? '#666666' : '#2F4F68', paddingVertical: 14, borderRadius: 30, width: '70%', alignSelf: 'center', alignItems: 'center', },
    buttonText: { color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', fontSize: 18, fontWeight: '600', textAlign: 'center' },
    footer: { fontSize: 16, marginTop: 20, marginBottom: 40, textAlign: 'center', color: colorScheme === 'dark' ? '#BBBBBB' : '#2F4F68', },
    screenBackground: { flex: 1, backgroundColor: colorScheme === 'dark' ? '#0A1420' : '#FFFFFF', justifyContent: 'center', padding: 24, },
    text: { fontSize: 18, marginBottom: 10, textAlign: 'center', color: colorScheme === 'dark' ? '#CCCCCC' : '#374151', },
    title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42', },
  });

  return (
    <View style={styles.screenBackground}>
      <Text style={styles.title}>Upgrade to Premium</Text>

      <Text style={styles.text}>Continue your baseball journey with:</Text>

      <Text style={styles.bullet}>• Unlimited ballpark check-ins</Text>
      <Text style={styles.bullet}>• Full premium access</Text>

      <Text style={styles.footer}>
        Free access remains available. Premium is $1.99 per month or $19.99 per year and renews automatically until cancelled.
      </Text>

      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={() => router.push('/settings/subscribe')}
      >
        <Text style={styles.buttonText}>Subscription Options</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonSecondary}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.buttonText}>Continue with Free Version</Text>
      </TouchableOpacity>

    </View>
  );
}