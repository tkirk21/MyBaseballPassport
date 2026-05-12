import { Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import Purchases from 'react-native-purchases';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingPuck from '../../components/loadingPuck';

export default function SubscribeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMonthlySubscribe = async () => {
    try {
      setLoading(true);

      const offerings = await Purchases.getOfferings();

      if (!offerings.current || offerings.current.availablePackages.length === 0) {
        setLoading(false);
        setAlertTitle('Unavailable');
        setAlertMessage('No subscription packages are available.');
        setAlertVisible(true);
        return;
      }

      const pkg = offerings.current.monthly;

      if (!pkg) {
        setLoading(false);
        setAlertTitle('Unavailable');
        setAlertMessage('Monthly package not found.');
        setAlertVisible(true);
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const hasPremium =
        customerInfo.entitlements.active['MY_BASEBALL_PASSPORT_PRO'] !== undefined;

      setLoading(false);

      if (hasPremium) {
        router.replace('/(tabs)');
        return;
      }

        setAlertTitle('Error');
        setAlertMessage('Purchase completed but entitlement not active.');
        setAlertVisible(true);

    } catch (e: any) {
      setLoading(false);

      if (e?.userCancelled) {
        return;
      }

      setAlertTitle('Purchase Failed');
      setAlertMessage(e?.message || 'Unable to complete purchase.');
      setAlertVisible(true);
    }
  };

  const handleYearlySubscribe = async () => {
    try {
      setLoading(true);

      const offerings = await Purchases.getOfferings();

      if (!offerings.current || offerings.current.availablePackages.length === 0) {
        setLoading(false);
        setAlertTitle('Unavailable');
        setAlertMessage('No subscription packages are available.');
        setAlertVisible(true);
        return;
      }

      const pkg = offerings.current.annual;

      if (!pkg) {
        setLoading(false);
        setAlertTitle('Unavailable');
        setAlertMessage('Yearly package not found.');
        setAlertVisible(true);
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      await new Promise(resolve => setTimeout(resolve, 1500));
      const refreshedInfo = await Purchases.getCustomerInfo();
      const hasPremium =
        refreshedInfo.entitlements.active['MY_BASEBALL_PASSPORT_PRO'] !== undefined;
      setLoading(false);

      if (hasPremium) {
        router.replace('/(tabs)');
        return;
      }

      setAlertTitle('Error');
      setAlertMessage('Purchase completed but entitlement not active.');
      setAlertVisible(true);

    } catch (e: any) {
      setLoading(false);

      if (e?.userCancelled) {
        return;
      }

      setAlertTitle('Purchase Failed');
      setAlertMessage(e?.message || 'Unable to complete purchase.');
      setAlertVisible(true);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);

      const customerInfo = await Purchases.restorePurchases();
      const hasPremium =
        customerInfo.entitlements.active['MY_BASEBALL_PASSPORT_PRO'] !== undefined;

      if (hasPremium) {
        router.replace('/(tabs)');
        return;
      }

      setAlertTitle('No Subscription Found');
      setAlertMessage('No active subscription could be restored.');
      setAlertVisible(true);

    } catch (e: any) {
      setLoading(false);

      setAlertTitle('Restore Failed');
      setAlertMessage(e?.message || 'Unable to restore purchases.');
      setAlertVisible(true);
    }
  };

  const styles = StyleSheet.create({
    alertOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center',padding:20},
    alertContainer:{backgroundColor:colorScheme==='dark'?'#0D131F':'#FFFFFF',borderRadius:16,padding:24,width:'100%',maxWidth:340,alignItems:'center',borderWidth:3,borderColor:colorScheme==='dark'?'#B22222':'#B22222',shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.4,shadowRadius:16,elevation:16},
    alertTitle:{fontSize:18,fontWeight:'700',color:colorScheme==='dark'?'#FFFFFF':'#0A2940',textAlign:'center',marginBottom:12},
    alertMessage:{fontSize:15,color:colorScheme==='dark'?'#AFC7E6':'#374151',textAlign:'center',marginBottom:24,lineHeight:22},
    alertButton:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#F5F1E6',paddingVertical:12,paddingHorizontal:32,borderRadius:30,borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222'},
    alertButtonText:{color:colorScheme==='dark'?'#FFFFFF':'#0A2940',fontWeight:'700',fontSize:16},
    button:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#FFFFFF',paddingVertical:14,borderRadius:30,alignItems:'center',borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222'},
    buttonText:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940',fontSize:18,fontWeight:'700'},
    card:{backgroundColor:colorScheme==='dark'?'#132F4F':'#F5F1E6',borderRadius:16,padding:20,borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222'},
    headerRow:{flexDirection:'row',alignItems:'center',marginBottom:30},
    headerTitle:{fontSize:28,fontWeight:'700',marginLeft:20,color:colorScheme==='dark'?'#F5F1E6':'#0A2940'},
    linkText: { color: '#B22222', textAlign: 'center', marginTop: 12, fontSize: 15, fontWeight: '600'},
    screen:{flex:1,backgroundColor:colorScheme==='dark'?'#0D131F':'#F5F1E6',paddingTop:insets.top+10,paddingHorizontal:20},
    subscriptionDisclosure: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 20, color: colorScheme === 'dark' ? '#AFC7E6' : '#374151'},
    text:{fontSize:16,lineHeight:22,color:colorScheme==='dark'?'#F5F1E6':'#374151',marginBottom:20},
    title:{fontSize:22,fontWeight:'700', textAlign: 'center', color:colorScheme==='dark'?'#F5F1E6':'#0A2940',marginBottom:10}
  });

  return (
    <View style={styles.screen}>
      {loading && <LoadingPuck />}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={28}
            color={colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42'}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>My Baseball Passport Premium</Text>
        <Text style={styles.text}>
          • $1.99 per month{'\n'}
          • $19.99 per year{'\n'}
          • Unlimited check-ins, maps, and stats{'\n'}
          • Full premium access across the app
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleMonthlySubscribe} disabled={loading}>
          <Text style={styles.buttonText}>Subscribe Monthly</Text>
        </TouchableOpacity>

        <View style={{ height: 12 }} />

        <TouchableOpacity style={styles.button} onPress={handleYearlySubscribe} disabled={loading}>
          <Text style={styles.buttonText}>Subscribe Yearly</Text>
        </TouchableOpacity>

        <View style={{ height: 12 }} />

        <TouchableOpacity style={styles.button} onPress={handleRestorePurchases} disabled={loading}>
          <Text style={styles.buttonText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.subscriptionDisclosure}>
        Subscription automatically renews unless cancelled at least 24 hours before the end of the current billing period. Your account will be charged for renewal within 24 hours before the end of the current period. You can manage or cancel your subscription anytime in your account settings after purchase.
        </Text>

        <Text
          style={styles.linkText}
          onPress={() => Linking.openURL('https://mysportspassport.app/privacy')}
        >
        Privacy Policy
        </Text>

        <Text
          style={styles.linkText}
          onPress={() => Linking.openURL('https://mysportspassport.app/terms')}
        >
        Terms of Use
        </Text>

        <Modal visible={alertVisible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertContainer}>
              <Text style={styles.alertTitle}>{alertTitle}</Text>
              <Text style={styles.alertMessage}>{alertMessage}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setAlertVisible(false)}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </View>
  );
}