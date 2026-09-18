//baseball//referrals.tsx
import React, { useEffect } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export default function ReferralsScreen() {
  const router = useRouter();
  const auth = getAuth();
  const colorScheme = useColorScheme();
  const [referralCode, setReferralCode] = React.useState('');
  const [successfulReferrals, setSuccessfulReferrals] = React.useState(0);
  const [freeMonthsEarned, setFreeMonthsEarned] = React.useState(0);
  const [premiumUntil, setPremiumUntil] = React.useState<any>(null);
  const [freeMonthStartDate, setFreeMonthStartDate] = React.useState<any>(null);
  const [subscriptionExpirationDate, setSubscriptionExpirationDate] = React.useState<string | null>(null);

   useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'profiles', auth.currentUser.uid);

    const unsubscribe = onSnapshot(userRef, async (userSnap) => {
      if (!userSnap.exists()) return;

      const data = userSnap.data();

      setSuccessfulReferrals(data.successfulReferrals || 0);
      setFreeMonthsEarned(data.freeMonthsEarned || 0);
      setPremiumUntil(data.premiumUntil || null);
      setFreeMonthStartDate(data.freeMonthStartDate || null);

      if (data.referralCode) {
        setReferralCode(data.referralCode);
        return;
      }

      const profileName =
        data.name ||
        data.profileName ||
        data.displayName ||
        data.username ||
        'USER';

      const cleanName = profileName
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

      const newReferralCode =
        cleanName.substring(0, 8) +
        Math.floor(1000 + Math.random() * 9000);

      await setDoc(
        userRef,
        { referralCode: newReferralCode },
        { merge: true }
      );

      setReferralCode(newReferralCode);
    });

    return () => unsubscribe();
  }, []);

  const shareReferralLink = async () => {
    try {
      await Share.share({
        message: `Join me on My Baseball Passport! https://mysportspassport.app/?ref=${referralCode}`,
      });
    } catch (error) {
      // silent fail
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: colorScheme === 'dark' ? '#0D131F' : '#F5F1E6', },
    backButton: { marginTop: 20, marginBottom: 20, },
    backIcon: { color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', },
    qrContainer: { alignItems: 'center', marginTop: 0, },
    qrText: { fontSize: 14, color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', textAlign: 'center', marginTop: 20, },
    referralCode: { fontSize: 18, marginTop: 8, color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', fontWeight: '700', textAlign: 'center', },
    referralDescription: { marginTop: 10, textAlign: 'center', color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', lineHeight: 18, },
    referralLabel: { fontSize: 16, marginTop: 20, color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', fontWeight: '600', textAlign: 'center', },
    referralStat: { fontSize: 16, color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', textAlign: 'center', marginTop: 10, },
    referralStatValue: { fontSize: 20, color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', fontWeight: '700', textAlign: 'center', marginBottom: 10, },
    shareButton: { marginTop: 12, backgroundColor: colorScheme === 'dark' ? '#243B5A' : '#0D2C42', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, },
    shareButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', },
    statsContainer: { marginTop: 20, alignItems: 'center' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 10, },
    statColumnWide: { alignItems: 'center', flex: 2.2 },
    statColumnNarrow: { alignItems: 'center', flex: 0.8 },
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={28} style={styles.backIcon} />
      </TouchableOpacity>

      <View style={styles.qrContainer}>
        <QRCode
          value={`https://mysportspassport.app/?ref=${referralCode}`}
          size={160}
        />

        <Text style={styles.qrText}>
          Scan to download My Baseball Passport
        </Text>

        <Text style={styles.referralLabel}>
          Your Referral Code
        </Text>

        <Text style={styles.referralCode}>
          {referralCode}
        </Text>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={shareReferralLink}
        >
          <Text style={styles.shareButtonText}>
            Share Referral Link
          </Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statColumnNarrow}>
            <Text style={styles.referralLabel}>
              Free Months
            </Text>

            <Text style={styles.referralCode}>
              {freeMonthsEarned}
            </Text>
          </View>

          <View style={{ alignItems: 'center', flex: 1.5 }}>
            <Text style={styles.referralLabel}>
              Free Premium Through
            </Text>

            <Text style={styles.referralCode}>
              {freeMonthStartDate?.toDate
                ? (
                    Date.now() >
                    freeMonthStartDate.toDate().getTime() +
                    30 * 24 * 60 * 60 * 1000 &&
                    freeMonthsEarned === 0
                  )
                    ? 'Expired - Resubscribe'
                    : new Date(
                        freeMonthStartDate.toDate().getTime() +
                        Math.max(freeMonthsEarned, 1) * 30 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString()
                : 'Not active yet'}
            </Text>
          </View>
        </View>

        <Text style={styles.referralDescription}>
          Earn 1 free month of Premium for every successful referral.
          Free months are automatically saved to your account.
          If you currently have an active subscription through Apple App Store or Google Play, your earned months will begin after your paid subscription ends.
          To use your earned months, cancel your subscription in your App Store subscription settings before your next renewal date.
          Once your earned months are exhausted, you can resubscribe at any time.
        </Text>
      </View>
    </View>
  );
}

