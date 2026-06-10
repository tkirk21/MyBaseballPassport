import React, { useEffect } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export default function ReferralsScreen() {
  const router = useRouter();
  const auth = getAuth();
  const colorScheme = useColorScheme();
  const [referralCode, setReferralCode] = React.useState('');
  const [successfulReferrals, setSuccessfulReferrals] = React.useState(0);
  const [freeMonthsEarned, setFreeMonthsEarned] = React.useState(0);

  useEffect(() => {
    const loadReferralCode = async () => {
      if (!auth.currentUser) return;

      const userRef = doc(db, 'profiles', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return;

      const data = userSnap.data();
      setSuccessfulReferrals(data.successfulReferrals || 0);
      setFreeMonthsEarned(data.freeMonthsEarned || 0);

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
    };

    loadReferralCode();
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
    qrContainer: { alignItems: 'center', marginTop: 30, },
    qrText: { fontSize: 18, color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', textAlign: 'center', marginTop: 20, },
    referralCode: { fontSize: 18, marginTop: 8, color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', fontWeight: '700', textAlign: 'center', },
    referralLabel: { fontSize: 16, marginTop: 20, color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', fontWeight: '600', textAlign: 'center', },
    referralStat: { fontSize: 16, color: '#0D2C42', textAlign: 'center', marginTop: 10, },
    referralStatValue: { fontSize: 20, color: '#0D2C42', fontWeight: '700', textAlign: 'center', marginBottom: 10, },
    shareButton: { marginTop: 24, backgroundColor: colorScheme === 'dark' ? '#243B5A' : '#0D2C42', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 30, },
    shareButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', },
    title: { fontSize: 28, fontWeight: '700', color: colorScheme === 'dark' ? '#F5F1E6' : '#0D2C42', marginBottom: 20, },
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={28} color="#0D2C42" />
      </TouchableOpacity>

      <Text style={styles.title}>Invite Friends</Text>

      <View style={styles.qrContainer}>
        <QRCode
          value={`https://mysportspassport.app/?ref=${referralCode}`}
          size={220}
        />

        <Text style={styles.referralLabel}>
          Referral Code
        </Text>

        <Text style={styles.referralLabel}>
          Referrals: {successfulReferrals} • Free Months: {freeMonthsEarned}
        </Text>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={shareReferralLink}
        >
          <Text style={styles.shareButtonText}>
            Share Referral Link
          </Text>
        </TouchableOpacity>

        <Text style={styles.qrText}>
          Scan to download My Baseball Passport
        </Text>
      </View>
    </View>
  );
}

