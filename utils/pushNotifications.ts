// utils/pushNotifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { getAuth } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return;
  if (!Device.isDevice) return;

  try {
    await user.getIdToken(); // validate session

    let finalStatus: Notifications.PermissionStatus;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      return;
    }

    if (finalStatus !== 'granted') {
      try {
        await setDoc(
          doc(db, 'profiles', user.uid),
          { pushToken: null },
          { merge: true }
        );
      } catch (error: any) {
        if (error?.code !== 'permission-denied') {
          console.error('Token null save failed:', error);
        }
      }
      return;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) return;

    try {
      const tokenObject = await Notifications.getExpoPushTokenAsync({ projectId });
      const pushToken = tokenObject.data;

      await setDoc(
        doc(db, 'profiles', user.uid),
        {
          pushToken,
          pushNotifications: true,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (error: any) {
      if (error?.code !== 'permission-denied') {
        console.error('Push token registration failed:', error);
      }
    }

  } catch (error: any) {
    if (error?.code !== 'permission-denied') {
      console.error('registerForPushNotificationsAsync failed:', error);
    }
  }
}

// Call this when user toggles push OFF
export async function disablePushToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  try {
    await user.getIdToken(); // validate session

    await setDoc(
      doc(db, 'profiles', user.uid),
      {
        pushToken: null,
        pushNotifications: false,
      },
      { merge: true }
    );

  } catch (error: any) {
    if (error?.code !== 'permission-denied') {
      console.error('disablePushToken failed:', error);
    }
  }
}