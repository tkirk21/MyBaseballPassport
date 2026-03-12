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
export const webClientId = '853703034223-101527k79a64l7aupy9ru8h0ph5sb2lf.apps.googleusercontent.com';
export const androidClientId = '853703034223-kd7c1r5j5q6b0q5r0q6r5j5q6b0q5r0q.apps.googleusercontent.com';

export { app, auth, db };