//context/PremiumContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import Purchases from 'react-native-purchases';

type PremiumContextType = {
  hasFullAccess: boolean;
  isInTrial: boolean;
  isSubscribed: boolean;
  isLoadingPremium: boolean;
  checkInCount: number;
};

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
    const [hasFullAccess, setHasFullAccess] = useState(false);
    const [isInTrial, setIsInTrial] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoadingPremium, setIsLoadingPremium] = useState(true);
    const [checkInCount, setCheckInCount] = useState(0);

  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    Purchases.configure({
      apiKey: Platform.OS === 'ios'
        ? 'appl_JGxavdoMkpHIjcnwSCOTJLcpqnY'
        : 'goog_oMcRJqarSxHaSinKLHIWjvrPbGD'
    });
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);

      if (!user) {
        setHasFullAccess(false);
        setIsInTrial(false);
        setIsSubscribed(false);
        setIsLoadingPremium(false);
        return;
      }

      setIsLoadingPremium(true);

      try {
        await Purchases.logIn(user.uid);
      } catch (e) {
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setHasFullAccess(false);
      setIsInTrial(false);
      setIsLoadingPremium(false);
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;
    let removeRcListener: (() => void) | null = null;

    const run = async () => {
      try {
        // STEP 1: WHITELIST
        try {
          const whitelistRef = doc(db, 'premiumWhitelist', 'global');
          const whitelistSnap = await getDoc(whitelistRef);

          if (whitelistSnap.exists()) {
            const data = whitelistSnap.data();
            if (data?.whitelistedUids?.includes(user.uid)) {
              setHasFullAccess(true);
              setIsInTrial(false);
              setIsLoadingPremium(false);
              return;
            }
          }
        } catch (err: any) {
          if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
            console.error('Whitelist check failed:', err);
          }
        }

        // STEP 2: PROFILE
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
          const profileRef = doc(db, 'profiles', user.uid);

          await setDoc(
            profileRef,
            { trialStart: serverTimestamp(), checkInCount: 0 },
            { merge: true }
          );

          setHasFullAccess(false);
          setIsInTrial(true);
          setIsSubscribed(false);
          setIsLoadingPremium(false);
          return;
        }

        const data = profileSnap.data();
        setCheckInCount(data?.checkInCount ?? 0);

        unsubscribeProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setCheckInCount(snap.data()?.checkInCount ?? 0);
          }
        });
        // unsubscribeProfile now handles live updates

        // STEP 2A: REVENUECAT ENTITLEMENT
        try {
          const customerInfo = await Purchases.getCustomerInfo();

          const hasPremium =
            customerInfo.entitlements.active['MY_BASEBALL_PASSPORT_PRO'] !== undefined;

          if (hasPremium) {
            setHasFullAccess(true);
            setIsInTrial(false);
            setIsSubscribed(true);
            setIsLoadingPremium(false);
            return;
          } else {
            setIsSubscribed(false);
          }
        } catch (e) {
          setIsSubscribed(false);
        }

        removeRcListener = Purchases.addCustomerInfoUpdateListener((customerInfo) => {
          const hasPremium =
            customerInfo.entitlements.active['MY SPORTS PASSPORT LLC Pro'] !== undefined;

          setIsSubscribed(hasPremium);
          setHasFullAccess(hasPremium);
        });

        // STEP 2B: TRIAL
        if (!data?.trialStart) {
          setHasFullAccess(false);
          setIsInTrial(false);
          setIsLoadingPremium(false);
          return;
        }

        let trialStartDate;

        if (data.trialStart?.toDate) {
          trialStartDate = data.trialStart.toDate();
        } else {
          trialStartDate = new Date(data.trialStart);
        }

        const expired =
          Date.now() - trialStartDate.getTime() >
          3 * 24 * 60 * 60 * 1000;

        setHasFullAccess(false);
        setIsInTrial(!expired);
        setIsLoadingPremium(false);

      } catch (err: any) {
        if (err?.code !== 'permission-denied') {
          console.error('Premium check failed:', err);
        }

        setHasFullAccess(false);
        setIsInTrial(false);
        setIsLoadingPremium(false);
      }
    };

    run();

  return () => {
    if (unsubscribeProfile) unsubscribeProfile();
    if (removeRcListener) removeRcListener();
  };
  }, [currentUser?.uid]);

  return (
    <PremiumContext.Provider value={{ hasFullAccess, isInTrial, isSubscribed, isLoadingPremium, checkInCount }}>
      {children}
    </PremiumContext.Provider>
  );
}

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};