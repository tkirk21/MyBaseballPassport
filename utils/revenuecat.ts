import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

const IOS_API_KEY = 'test_SxhPsLnMNaklGjWdYCZKxsGHnPM';
const ANDROID_API_KEY = 'test_SxhPsLnMNaklGjWdYCZKxsGHnPM';

export const configureRevenueCat = async (userId: string) => {
  const apiKey =
    Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;

  await Purchases.configure({
    apiKey,
    appUserID: userId,
  });
};