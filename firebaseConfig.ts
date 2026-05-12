// firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';          // ← NEW
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDBP0w1sBO35bz6XNlB7CBkRXBdCZ-eTTI",
  authDomain: "mybaseballpassport.firebaseapp.com",
  projectId: "mybaseballpassport",
  storageBucket: "mybaseballpassport.appspot.com",
  messagingSenderId: "171882071353",
  appId: "1:171882071353:web:3394307477ffe24df6d4e8"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);                             // ← NEW

// EXACT IDs FROM YOUR GOOGLE CLOUD CONSOLE
export const webClientId = '171882071353-dp1c0n12p70kvu4579h22rje79ov2e7o.apps.googleusercontent.com';
export const iosClientId = '171882071353-nr5q1n4bgphk1a2uk6u76ag4per9p80p.apps.googleusercontent.com';

export { app, auth, db };