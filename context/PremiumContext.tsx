//context/PremiumContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth, db } from '@/firebaseConfig';
import { doc, getDoc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Purchases from 'react-native-purchases';

type PremiumContextType = {
  hasFullAccess: boolean;
  isInTrial: boolean;
  isSubscribed: boolean;
  isLoadingPremium: boolean;
  checkInCount: number;
  customerInfo: any;
  subscriptionExpirationDate: string | null;
};

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
    const [hasFullAccess, setHasFullAccess] = useState(false);
    const [isInTrial, setIsInTrial] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoadingPremium, setIsLoadingPremium] = useState(true);
    const [checkInCount, setCheckInCount] = useState(0);
    const [customerInfo, setCustomerInfo] = useState<any>(null);
    const [subscriptionExpirationDate, setSubscriptionExpirationDate] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    try {
      Purchases.configure({
        apiKey: Platform.OS === 'ios'
          ? 'appl_hhmMXIFBfktKinKnlQOSkZMURYY'
          : 'goog_eyNGjXLylnSmoGOHGhXMbDoPKtb'
      });
    } catch (e) {
      console.log('Subscription service could not start.', e);
    }
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
            {
              trialStart: serverTimestamp(),
              checkInCount: 0,
              freeMonthsEarned: 0,
              freeMonthStartDate: null,
            },
            { merge: true }
          );

          setHasFullAccess(false);
          setIsInTrial(true);
          setIsSubscribed(false);
          setIsLoadingPremium(false);
          return;
        }

        const data = profileSnap.data();

        const today = new Date().toLocaleDateString('en-CA');
        setCheckInCount(data?.[`dailyCheckInCounts.${today}`] ?? 0);

        unsubscribeProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            const liveData = snap.data();
            const today = new Date().toLocaleDateString('en-CA');
            setCheckInCount(liveData?.[`dailyCheckInCounts.${today}`] ?? 0);
          }
        });
        // unsubscribeProfile now handles live updates

        let expirationDate: Date | null = null;

        // STEP 2A: REVENUECAT ENTITLEMENT
        try {
          const customerInfo = await Purchases.getCustomerInfo();
          console.log('RC CUSTOMER INFO:', JSON.stringify(customerInfo, null, 2));
          setCustomerInfo(customerInfo);

          const entitlement =
            customerInfo.entitlements.active['MY_BASEBALL_PASSPORT_PRO'];

          setSubscriptionExpirationDate(
            entitlement?.expirationDate ?? null
          );

          expirationDate =
            entitlement?.expirationDate
              ? new Date(entitlement.expirationDate)
              : null;

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
          setCustomerInfo(customerInfo);

          const entitlement =
            customerInfo.entitlements.active['MY_BASEBALL_PASSPORT_PRO'];

          setSubscriptionExpirationDate(
            entitlement?.expirationDate ?? null
          );

          const hasPremium =
            customerInfo.entitlements.active['MY_BASEBALL_PASSPORT_PRO'] !== undefined;

          setIsSubscribed(hasPremium);
          setHasFullAccess(hasPremium);
        });

        if (
          !data?.freeMonthStartDate &&
          (data?.freeMonthsEarned || 0) > 0 &&
          (
            expirationDate === null ||
            expirationDate <= new Date()
          )
        ) {
          await updateDoc(profileRef, {
            freeMonthStartDate: serverTimestamp(),
          });

          setHasFullAccess(true);
          setIsInTrial(false);
          setIsSubscribed(false);
          setIsLoadingPremium(false);
          return;
        }

        if (data?.freeMonthStartDate) {
          const startDate = data.freeMonthStartDate?.toDate
            ? data.freeMonthStartDate.toDate()
            : new Date(data.freeMonthStartDate);

          const expired =
            Date.now() - startDate.getTime() >
            30 * 24 * 60 * 60 * 1000;

          if (!expired) {
            setHasFullAccess(true);
            setIsInTrial(false);
            setIsSubscribed(false);
            setIsLoadingPremium(false);
            return;
          }

          if ((data?.freeMonthsEarned || 0) > 0) {
            await updateDoc(profileRef, {
              freeMonthsEarned: (data.freeMonthsEarned || 0) - 1,
              freeMonthStartDate: serverTimestamp(),
            });

            setHasFullAccess(true);
            setIsInTrial(false);
            setIsSubscribed(false);
            setIsLoadingPremium(false);
            return;
          }
        }

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
    <PremiumContext.Provider value={{ hasFullAccess, isInTrial, isSubscribed, isLoadingPremium, checkInCount, customerInfo, subscriptionExpirationDate }}>
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