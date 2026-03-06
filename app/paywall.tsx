import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        customerInfo.entitlements.active['MY SPORTS PASSPORT LLC Pro'] !== undefined;

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
    buttonText: { color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', fontSize: 18, fontWeight: '600', },
    footer: { fontSize: 16, marginTop: 20, marginBottom: 40, textAlign: 'center', color: colorScheme === 'dark' ? '#BBBBBB' : '#2F4F68', },
    screenBackground: { flex: 1, backgroundColor: colorScheme === 'dark' ? '#0A1420' : '#FFFFFF', justifyContent: 'center', padding: 24, },
    text: { fontSize: 18, marginBottom: 10, textAlign: 'center', color: colorScheme === 'dark' ? '#CCCCCC' : '#374151', },
    title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42', },
  });

  return (
    <View style={styles.screenBackground}>
      <Text style={styles.title}>Your Trial Has Ended</Text>

      <Text style={styles.text}>Continue your hockey journey with:</Text>

      <Text style={styles.bullet}>• Unlimited arena check-ins</Text>
      <Text style={styles.bullet}>• Full access to all features</Text>

      <Text style={styles.footer}>
        Subscribe for $2.99 per month to keep exploring arenas and tracking your hockey journey.
      </Text>

      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={handleSubscribe}
      >
        <Text style={styles.buttonText}>Subscribe</Text>
      </TouchableOpacity>

    </View>
  );
}