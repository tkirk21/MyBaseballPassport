import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { db } from '../firebaseConfig';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Ask for permission + get the push token
export async function setupNotifications() {
  try {
    const user = getAuth().currentUser;
    if (!user) return;

    await user.getIdToken(); // validate session

    // Load the pushNotifications setting from profile
    let pushEnabled = true;

    try {
      const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
      pushEnabled = profileSnap.exists()
        ? profileSnap.data()?.pushNotifications ?? true
        : true;
    } catch (error: any) {
      if (error?.code !== 'permission-denied') {
        console.error('Profile read failed:', error);
      }
      return;
    }

    if (!pushEnabled) return;

    if (!Device.isDevice) return;

    const token = await registerForPushNotificationsAsync();

    if (token) {
      try {
        await saveTokenToDatabase(token);
      } catch (error: any) {
        if (error?.code !== 'permission-denied') {
          console.error('Token save failed:', error);
        }
      }
    }

  } catch (error: any) {
    if (error?.code !== 'permission-denied') {
      console.error('Push setup error:', error);
    }
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}