//[arenaId.tsx]
import { format } from 'date-fns';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getAuth } from 'firebase/auth';
import { collection, collectionGroup, doc, getDocs, getDoc, getFirestore, increment, onSnapshot, query, updateDoc, where, } from 'firebase/firestore';
import firebaseApp from '@/firebaseConfig';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ImageBackground, Linking, Modal, StyleSheet, ScrollView, Text, TouchableOpacity, View, } from 'react-native';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePremium } from '@/context/PremiumContext';

import LoadingPuck from '@/components/loadingPuck';
import localArenaData from '@/assets/data/arenas.json';
import { loadArenas } from '@/utils/loadArenas';
import localHistoricalTeamsData from '@/assets/data/historicalTeams.json';
import { loadHistoricalTeams } from '@/utils/loadHistoricalTeams';
import localArenaHistoryData from '@/assets/data/arenaHistory.json';
import { loadArenaHistory } from '@/utils/loadArenaHistory';
import { loadSchedule } from '@/utils/loadSchedule';

export default function ArenaScreen() {
  const { arenaId } = useLocalSearchParams();
  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;
  const { hasFullAccess, isInTrial, isLoadingPremium } = usePremium();
  const hasAppAccess = hasFullAccess || isInTrial;
  const [bannerPhotoLoading, setBannerPhotoLoading] = useState(true);
  const [visitLoading, setVisitLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [rankLoading, setRankLoading] = useState(true);
  const [tipsLoading, setTipsLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [distanceUnit, setDistanceUnit] = useState<'miles' | 'km'>('miles');
  const [visitCount, setVisitCount] = useState(0);
  const [globalCheckinCount, setGlobalCheckinCount] = useState(0);
  const [arenaRank, setArenaRank] = useState<number | null>(null);
  const [sharedTips, setSharedTips] = useState<any[]>([]);
  const [sharedArenaPhotos, setSharedArenaPhotos] = useState<any[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [cheeredPhotos, setCheeredPhotos] = useState<string[]>([]);
  const [lastVisitDate, setLastVisitDate] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [arenaData, setArenaData] = useState(localArenaData);
  const [historicalArenasData, setHistoricalArenasData] = useState(localHistoricalTeamsData);
  const [arenaHistoryData, setArenaHistoryData] = useState(localArenaHistoryData);
  const [combinedSchedule, setCombinedSchedule] = useState<any[]>([]);
  const [giveawayVisible, setGiveawayVisible] = useState(false);
  const [selectedGiveaway, setSelectedGiveaway] = useState<any>(null);
  const [fireworksVisible, setFireworksVisible] = useState(false);
  const [selectedFireworks, setSelectedFireworks] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const arenas = await loadArenas();
      if (arenas.length > 0) {
        setArenaData(arenas);
      }

      const history = await loadArenaHistory();
      if (history.length > 0) {
        setArenaHistoryData(history);
      }

      const historical = await loadHistoricalTeams();
      if (historical.length > 0) {
        setHistoricalArenasData(historical);
      }

      const [
        mlb,
        il,
        pcl,
        el,
        sl,
        tl,
        mwl,
        nwl,
        sal,
        fsl,
        cl,
        cal,
        acl,
        fcl,
        dsl,
        fl,
        alpb,
        aapb,
        pl,
        npb,
        kbo,
        cpbl,
        lmb,
        abl,
      ] = await Promise.all([
        loadSchedule('mlbSchedule.json'),
        loadSchedule('ilSchedule.json'),
        loadSchedule('pclSchedule.json'),
        loadSchedule('elSchedule.json'),
        loadSchedule('slSchedule.json'),
        loadSchedule('tlSchedule.json'),
        loadSchedule('mwlSchedule.json'),
        loadSchedule('nwlSchedule.json'),
        loadSchedule('salSchedule.json'),
        loadSchedule('fslSchedule.json'),
        loadSchedule('clSchedule.json'),
        loadSchedule('calSchedule.json'),
        loadSchedule('aclSchedule.json'),
        loadSchedule('fclSchedule.json'),
        loadSchedule('dslSchedule.json'),
        loadSchedule('flSchedule.json'),
        loadSchedule('alpbSchedule.json'),
        loadSchedule('aapbSchedule.json'),
        loadSchedule('plSchedule.json'),
        loadSchedule('npbSchedule.json'),
        loadSchedule('kboSchedule.json'),
        loadSchedule('cpblSchedule.json'),
        loadSchedule('lmbSchedule.json'),
        loadSchedule('ablSchedule.json'),
      ]);

      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      const allSchedules = [
        ...mlb,
        ...il,
        ...pcl,
        ...el,
        ...sl,
        ...tl,
        ...mwl,
        ...nwl,
        ...sal,
        ...fsl,
        ...cl,
        ...cal,
        ...acl,
        ...fcl,
        ...dsl,
        ...fl,
        ...alpb,
        ...aapb,
        ...pl,
        ...npb,
        ...kbo,
        ...cpbl,
        ...lmb,
        ...abl,
      ].filter((game) => {
        const gameTime = new Date(game.date).getTime();
        return !isNaN(gameTime) && gameTime >= thirtyDaysAgo;
      });

      setCombinedSchedule(
        allSchedules.map((game) => ({
          ...game,
          homeTeam:
            [...arenas, ...historical].find(
              a => a.teamCode === game.team && a.league === game.league
            )?.teamName || game.team,
          awayTeam:
            [...arenas, ...historical].find(
              a => a.teamCode === game.opponent && a.league === game.league
            )?.teamName || game.opponent,
        }))
      );
    };

    fetchData();
  }, []);

  const arena =
    arenaData.find((a) =>
      a.latitude != null &&
      a.longitude != null &&
      `${a.latitude.toFixed(6)}_${a.longitude.toFixed(6)}` === arenaId
    ) ||
    historicalArenasData.find((a) =>
      a.latitude != null &&
      a.longitude != null &&
      `${a.latitude.toFixed(6)}_${a.longitude.toFixed(6)}` === arenaId
    );

  useEffect(() => {
    if (hasFullAccess === undefined && isInTrial === undefined) return;

    const run = async () => {
      if (!arena || !user?.uid) return;

      try {
        setBannerPhotoLoading(true);
        setVisitLoading(true);
        setGlobalLoading(true);
        setRankLoading(true);
        setTipsLoading(true);

        const historyEntry = arenaHistoryData.find(
          h => h.currentArena === arena.arena
        );

        const oldNames = historyEntry
          ? historyEntry.history.map(h => h.name)
          : [];

        const namesToMatch = [arena.arena, ...oldNames];

        const q = query(
          collection(db, 'profiles', user.uid, 'checkins'),
          where('arenaName', 'in', namesToMatch)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setVisitCount(0);
          setLastVisitDate(null);
          setVisitLoading(false);
        }

        setVisitCount(snapshot.size);

        const gameDates = snapshot.docs
          .map(doc => {
            const gameDateStr = doc.data().gameDate;
            if (!gameDateStr) return null;
            const date = new Date(gameDateStr);
            return isNaN(date.getTime()) ? null : date;
          })
          .filter(date => date !== null);

        const sorted = gameDates.sort(
          (a, b) => b.getTime() - a.getTime()
        );

        setLastVisitDate(sorted[0] || null);
        setVisitLoading(false);

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const arenaCheckinsSnap = await getDocs(
          collection(db, 'arenas', arena.arenaId, 'checkins')
        );

        const allTipDocs = arenaCheckinsSnap.docs.filter(docSnap => {
          const data = docSnap.data();

          return (
            data.shareParkingTip === true ||
            data.sharePregameBar === true ||
            data.sharedPhotoFlags?.some((f: number) => f === 1 || f === true)
          );
        });

        const filteredDocs = allTipDocs;
        
        const tips = (
          await Promise.all(
            filteredDocs.map(async (docSnap) => {
              const data = docSnap.data();

              let userName = 'Fan';
              let userPhoto = '';

              if (data.userId) {
                const profileSnap = await getDoc(doc(db, 'profiles', data.userId));

                if (profileSnap.exists()) {
                  const profile = profileSnap.data();
                  userName = profile.name || 'Fan';
                  userPhoto = profile.imageUrl || '';
                }
              }

              return {
                id: docSnap.id,
                ...data,
                userName,
                userPhoto,
              };
            })
          )
        )
        .filter((tip: any) =>
          (
            (tip.shareParkingTip && tip.ParkingAndTravel?.trim()) ||
            (tip.sharePregameBar && tip.pregameBar?.trim())
          )
        )
        .sort((a: any, b: any) =>
          b.timestamp?.toDate?.()?.getTime?.() - a.timestamp?.toDate?.()?.getTime?.()
        )
        .slice(0, 5);

        setSharedTips(tips);
        setTipsLoading(false);

        const photoTips = await (
          await Promise.all(
            filteredDocs.map(async (docSnap) => {
              const data = docSnap.data();

              let userName = 'Fan';
              let userPhoto = '';

              if (data.userId) {
                const profileSnap = await getDoc(doc(db, 'profiles', data.userId));

                if (profileSnap.exists()) {
                  const profile = profileSnap.data();
                  userName = profile.name || 'Fan';
                  userPhoto = profile.imageUrl || '';
                }
              }

              return {
                id: docSnap.id,
                ...data,
                userName,
                userPhoto,
              };
            })
          )
        )
        .flatMap((item: any) =>
          (item.photos || [])
            .map((photo: string, index: number) => ({
              id: `${item.id}-${index}`,
              photo,
              shared: item.sharedPhotoFlags?.[index] === true || item.sharedPhotoFlags?.[index] === 1,
              userName: item.userName,
              userPhoto: item.userPhoto,
              timestamp: item.timestamp,
            }))
            .filter((p: any) =>
              p.photo &&
              typeof p.photo === 'string'
            )
            .map(async (p: any) => {
              return {
                ...p,
                cheerCount: item.cheerCount || 0,
              };
            })
        )
        .slice(0, 12);

        const resolvedPhotoTips = (await Promise.all(photoTips))
          .filter((p: any) =>
            p.shared &&
            p.photo &&
            typeof p.photo === 'string'
          )
          .sort((a: any, b: any) => b.cheerCount - a.cheerCount);

        setSharedArenaPhotos(resolvedPhotoTips);
        setBannerPhotoLoading(false);

        const arenaParentSnap = await getDoc(doc(db, 'arenas', arena.arenaId));

        if (arenaParentSnap.exists()) {
          setGlobalCheckinCount(arenaParentSnap.data().totalCheckins || 0);
        } else {
          setGlobalCheckinCount(0);
        }
        setGlobalLoading(false);

        const allArenaDocs = await getDocs(collection(db, 'arenas'));
        const arenaCounts = allArenaDocs.docs
          .map(docSnap => ({
            arenaId: docSnap.id,
            count: docSnap.data().totalCheckins || 0,
          }))
          .filter(a => a.count > 0)
          .sort((a, b) => b.count - a.count);

        const rankIndex = arenaCounts.findIndex(
          a => a.arenaId === arena.arenaId
        );

        setArenaRank(rankIndex >= 0 ? rankIndex + 1 : null);
        setRankLoading(false);

      } catch (error: any) {
        if (error?.code === 'permission-denied') {
          setAlertTitle('Permission Error');
          setAlertMessage('Unable to load visit history.');
        } else if (error?.code === 'unauthenticated') {
          setAlertTitle('Session Expired');
          setAlertMessage('Session expired. Please log in again.');
        } else {
          setAlertTitle('Error');
          setAlertMessage('Failed to load visit data.');
        }

        setAlertVisible(true);

        setVisitCount(0);
        setLastVisitDate(null);
      } finally {
        setBannerPhotoLoading(false);
        setVisitLoading(false);
        setGlobalLoading(false);
        setRankLoading(false);
        setTipsLoading(false);
      }
    };

    run();
  }, [arena, hasAppAccess, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const profileRef = doc(db, 'profiles', user.uid);

    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const unit =
            snap.data().distanceUnit === 'km' ? 'km' : 'miles';
          setDistanceUnit(unit);
        } else {
          setDistanceUnit('miles');
        }
      },
      (error: any) => {
        if (!auth.currentUser) return;
        if (error?.code === 'permission-denied') {
          setAlertTitle('Permission Error');
          setAlertMessage('Unable to read distance preference.');
        } else if (error?.code === 'unauthenticated') {
          setAlertTitle('Session Expired');
          setAlertMessage('Session expired. Please log in again.');
        } else {
          setAlertTitle('Error');
          setAlertMessage('Failed to load distance preference.');
        }

        setAlertVisible(true);
        setDistanceUnit('miles');
      }
    );

    return () => unsub();
  }, []);


  const teamCodeMap = useMemo(() => (
    Object.fromEntries(
      arenaData.map((a) => [`${a.league}_${a.teamCode}`, a.teamName])
    )
  ), [arenaData]);

  const handleDirections = async () => {
    try {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${arena.latitude},${arena.longitude}`;
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        setAlertTitle('Error');
        setAlertMessage('Cannot open Google Maps on this device.');
        setAlertVisible(true);
        return;
      }

      await Linking.openURL(url);
    } catch (error: any) {
      setAlertTitle('Error');
      setAlertMessage('Failed to open directions.');
      setAlertVisible(true);
    }
  };

   // Filter & sort upcoming games at this arena
   let upcomingGames = combinedSchedule
     .filter((game) => {
       if (!arena) return false;
       if (!game?.date) return false;
       if (game.arena !== arena.arena) return false;

       const gameDate = new Date(game.date);
       if (isNaN(gameDate.getTime())) return false;

       return gameDate.getTime() > Date.now();
     })

    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);

      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;

      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3);

  // ✅ Fallback: if no upcoming games, default to next preseason
  if (upcomingGames.length === 0 && arena) {
    upcomingGames = [{
      id: 'default-next-season',
      league: arena.league,
      date: '2027-02-1T19:00:00Z',
      arena: arena.arena,
      homeTeam: arena.teamName,
      awayTeam: 'TBD',
    }];
  }

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = distanceUnit === 'km' ? 6371 : 3958.8; // Earth radius in km or miles
    const toRad = n => n * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCheckingIn(false);
        setAlertTitle('Permission Error');
        setAlertMessage('Location permission is required to check in.');
        setAlertVisible(true);
        return;
      }

      const threshold = distanceUnit === 'km' ? 0.45 : 0.28;
      const unit = distanceUnit === 'km' ? 'km' : 'miles';

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 15000,
      });

      const distance = getDistance(
        location.coords.latitude,
        location.coords.longitude,
        arena.latitude,
        arena.longitude
      );

      const now = new Date().getTime();

      const todaysGames = combinedSchedule.filter((game) => {
        if (!game?.date) return false;
        if (game.arena !== arena.arena) return false;

        const gameDate = new Date(game.date);

        return (
          gameDate.getFullYear() === new Date().getFullYear() &&
          gameDate.getMonth() === new Date().getMonth() &&
          gameDate.getDate() === new Date().getDate()
        );
      });

      if (todaysGames.length === 0) {
        setCheckingIn(false);
        setAlertTitle('No Game Today');
        setAlertMessage('There is no game today at this ballpark.');
        setAlertVisible(true);
        return;
      }

      const liveWindowGame = todaysGames.find((game) => {
        const startDate = new Date(game.date);

        if (isNaN(startDate.getTime())) return false;

        const start = startDate.getTime();
        const oneHourBefore = start - (60 * 60 * 1000);
        const threeHourGame = start + (3 * 60 * 60 * 1000);
        const oneHourAfter = threeHourGame + (60 * 60 * 1000);

        return now >= oneHourBefore && now <= oneHourAfter;
      });

      if (!liveWindowGame) {
        setCheckingIn(false);
        setAlertTitle('Outside Check-In Window');
        setAlertMessage('The game is not currently within the live check-in window.');
        setAlertVisible(true);
        return;
      }

      if (distance > threshold) {
        setCheckingIn(false);
        setAlertTitle('Not Close Enough');
        setAlertMessage(
          `You're ${distance.toFixed(2)} ${unit} from ${arena.arena}.\nGet closer to check in!`
        );
        setAlertVisible(true);
        return;
      }

      setCheckingIn(false);

      router.push({
        pathname: '/checkin/live',
        params: {
          league: liveWindowGame.league,
          arenaName: arena.arena,
          homeTeam: liveWindowGame.homeTeam,
          opponent: liveWindowGame.awayTeam,
          gameDate: liveWindowGame.date,
        },
      });

    } catch (error: any) {
      setCheckingIn(false);

      if (error?.code === 'permission-denied') {
        setAlertTitle('Permission Error');
        setAlertMessage('Permission denied while checking in.');
      } else if (error?.code === 'unauthenticated') {
        setAlertTitle('Session Expired');
        setAlertMessage('Session expired. Please log in again.');
      } else if (error?.message?.toLowerCase().includes('network')) {
        setAlertTitle('Network Error');
        setAlertMessage('Network error. Check your connection and try again.');
      } else {
        setAlertTitle('Error');
        setAlertMessage('Unexpected error during check-in.');
      }

      setAlertVisible(true);
    }
  };

  useEffect(() => {
    if (!upcomingGames || upcomingGames.length === 0) {
      setTimeLeft('');
      return;
    }

    const firstGame = upcomingGames[0];

    if (!firstGame?.date) {
      setTimeLeft('');
      return;
    }

    const startDate = new Date(firstGame.date);

    if (isNaN(startDate.getTime())) {
      setTimeLeft('');
      return;
    }

    const nextGameTime = startDate.getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = nextGameTime - now;

      if (diff <= 0) {
        setTimeLeft('FIRST PITCH!');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);

      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      let display = '';

      if (days > 0) {
        display = `${days}d ${hours}h ${minutes}m`;
      } else if (hours > 0) {
        display = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        display = `${minutes}m ${seconds}s`;
      } else {
        display = `${seconds}s`;
      }

      setTimeLeft(display);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [upcomingGames]);

  if (isLoadingPremium) return <LoadingPuck size={120} />;
  if (!arena) return null;


  const lightColor = `${arena.colorCode}66`;
    const borderColor =
      colorScheme === 'dark'
        ? '#FFFFFF'
        : (arena.colorCode2 || arena.colorCode);

  const handlePhotoCheer = async (photoId: string) => {
    const alreadyCheered = cheeredPhotos.includes(photoId);

    const realDocId = photoId.split('-')[0];

    const photoRef = doc(db, 'arenas', arena.arenaId, 'checkins', realDocId);

    await updateDoc(photoRef, {
      cheerCount: increment(alreadyCheered ? -1 : 1),
    });

    setCheeredPhotos(prev =>
      alreadyCheered
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );

    setSharedArenaPhotos(prev =>
      [...prev]
        .map(photo =>
          photo.id === photoId
            ? {
                ...photo,
                cheerCount: alreadyCheered
                  ? Math.max((photo.cheerCount || 1) - 1, 0)
                  : (photo.cheerCount || 0) + 1,
              }
            : photo
        )
        .sort((a, b) => b.cheerCount - a.cheerCount)
    );
  };

  const styles = StyleSheet.create({
    alertButton:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#F5F1E6',borderWidth:2,borderColor:colorScheme==='dark'?'#4A6FA5':'#2F4F68',paddingVertical:12,paddingHorizontal:32,borderRadius:30},
    alertButtonText: { color: colorScheme === 'dark' ? '#FFFFFF' : '#1F2937', fontWeight: '700', fontSize: 16 },
    alertContainer:{backgroundColor:colorScheme==='dark'?'#0A2940':'#FFFFFF',borderRadius:16,padding:24,width:'100%',maxWidth:340,alignItems:'center',borderWidth:3,borderColor:colorScheme==='dark'?'#4A6FA5':'#2F4F68',shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.3,shadowRadius:16,elevation:16},
    alertMessage: { fontSize: 15, color: colorScheme === 'dark' ? '#CCCCCC' : '#374151', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    alertTitle: { fontSize: 18, fontWeight: '700', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', textAlign: 'center', marginBottom: 12 },
    arenaName: { fontSize: 28, top: 10, fontWeight: 'bold', color: '#fff', textAlign: 'center', },
    backButton: { position: 'absolute', left: 10, zIndex: 10, borderRadius: 20, padding: 8, },
    bannerStatCard: { marginHorizontal: 20, marginTop: 20, marginBottom: 10, height: 120, width: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderWidth: 4, zIndex: 2, borderColor: colorScheme === 'dark' ? lightColor : (arena.colorCode || '#2F5D50') },
    bannerWrapper: { marginHorizontal: 20, marginBottom: 20 },
    bannerImage: { height: 220, borderRadius: 12, overflow: 'hidden' },
    bannerImageRadius: { borderRadius: 12 },
    bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
    button:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#F5F1E6',marginHorizontal:90,paddingVertical:18,borderRadius:30,alignItems:'center',marginTop:10,borderWidth:2,borderColor:colorScheme==='dark'?'#4A6FA5':'#2F4F68'},
    buttonText:{color:colorScheme==='dark'?'#FFFFFF':'#1D3557',fontSize:16,fontWeight:'600'},
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FA', },
    cheerButton: { marginTop: 4 },
    cheerText: { fontSize: 13, fontWeight: '600', color: colorScheme === 'dark' ? '#FFFFFF' : '#16221D' },
    container: { paddingBottom: 80, backgroundColor: 'transparent', },
    countdownBox: { backgroundColor: '#0A2940', alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 0, borderRadius: 14, marginBottom: 16, minWidth: 150, minHeight: 75, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 12, borderWidth: 1, },
    countdownLabel: { fontSize: 11, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', marginTop: -10, opacity: 0.9, },
    countdownNumber: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', lineHeight: 46, },
    errorText: { fontSize: 18, color: 'red', },
    fanPhotoCard: { alignItems: 'center', marginRight: 10 },
    fanPhotoThumb: { width: 90, height: 90, borderRadius: 8, marginRight: 10 },
    fanTipsBase: { borderRadius: 12 },
    fanTipsBorder: { backgroundColor: 'transparent', borderRadius: 12 },
    fanTipsTint: { borderRadius: 8 },
    gameCard: { marginBottom: 12, },
    gameText: { fontSize: 14, color: colorScheme === 'dark' ? '#FFFFFF' : '#1F2937', textAlign: 'center' },
    gameTextBold: { fontSize: 16, fontWeight: 'bold', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', textAlign: 'center' },
    giveawayEmoji:{fontSize:24},
    header: { padding: 34, alignItems: 'center', fontWeight: 'bold', color: '#0D2C42', marginBottom: 15, textAlign: 'center', },
    infoBox: { backgroundColor: 'rgba(255,255,255,0.95)', margin: 4, padding: 16, marginHorizontal: 20, borderRadius: 12, borderWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, alignItems: 'center', },
    label: { fontSize: 14, color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', fontWeight: 'bold', marginTop: 12 },
    lastVisitText: { marginTop: 0, fontSize: 12, color: colorScheme === 'dark' ? '#FFFFFF' : '#475569' },
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999, justifyContent: 'center', alignItems: 'center', },
    photoModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    photoModalClose: { position: 'absolute', top: 60, right: 30, zIndex: 2 },
    photoModalCloseText: { color: '#fff', fontSize: 28 },
    photoModalImage: { width: '90%', height: '70%', resizeMode: 'contain' },
    premiumLockText:{color:'#FFFFFF',fontSize:16,fontWeight:'700',textAlign:'center',backgroundColor:'rgba(0,0,0,0.45)',paddingVertical:8,paddingHorizontal:12,borderRadius:10,overflow:'hidden'},
    rankStrip: { marginHorizontal: 20, marginTop: 0, marginBottom: 12, borderRadius: 12, borderWidth: 4, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 14, overflow: 'hidden' },
    rankColumn: { flex: 1, alignItems: 'center' },
    rankDivider: { width: 1, height: 36, backgroundColor: '#FFFFFF55' },
    rankNumber: { fontSize: 22, fontWeight: '800', color: colorScheme === 'dark' ? '#FFFFFF' : '#16221D' },
    rankLabel: { fontSize: 12, fontWeight: '600', color: colorScheme === 'dark' ? '#FFFFFF' : '#334155', marginTop: 4 },
    section: { marginTop: 30, marginHorizontal: 20, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', marginBottom: 12, textAlign: 'center' },
    statCard: { marginHorizontal: 20, marginTop: 8, marginBottom: 8, paddingVertical: 20, borderRadius: 60, alignItems: 'center', width: 120, alignSelf: 'center', borderWidth: 4, borderColor: colorScheme === 'dark' ? lightColor : (arena.colorCode || '#0D2C42') },
    statLabel: { marginTop: 4, fontSize: 12, color: colorScheme === 'dark' ? '#FFFFFF' : '#334155', letterSpacing: 0.3 },
    statNumber: { fontSize: 24, fontWeight: '800', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', lineHeight: 24 },
    timeGiveawayButton:{marginLeft:8},
    timeRow:{flexDirection:'row',justifyContent:'center',alignItems:'center'},
    tipCard: { width: '100%', backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)', borderRadius: 10, padding: 12, marginBottom: 14 },
    tipUserName: { color: '#fff', fontSize: 13, textAlign: 'center', marginTop: 6 },
    tipUserRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 6 },
    tipUserPhoto: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
    tipUserName: { fontSize: 14, fontWeight: 'bold', color: colorScheme === 'dark' ? '#FFFFFF' : '#16221D' },
    value: { fontSize: 16, color: colorScheme === 'dark' ? '#FFFFFF' : '#1F2937', textAlign: 'center' },
  });

  return (
    <ImageBackground
      source={colorScheme === 'dark' ? require('@/assets/images/background_inside_arena_dark.jpg') : require('@/assets/images/background_inside_arena.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      {/* CUSTOM THEMED ALERT MODAL */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{alertTitle}</Text>

            <Text style={styles.alertMessage}>{alertMessage}</Text>

            <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setAlertVisible(false)}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={giveawayVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            {(selectedGiveaway
              ? (Array.isArray(selectedGiveaway) ? selectedGiveaway : [selectedGiveaway])
              : []
            ).map((giveaway: any, index: number) => (
              <View key={index} style={{ marginBottom: 16 }}>
                <Text style={styles.alertTitle}>
                  {giveaway.title}
                </Text>

                <Text style={styles.alertMessage}>
                  {giveaway.details}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setGiveawayVisible(false)}
            >
              <Text style={styles.alertButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={fireworksVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            {(selectedFireworks
              ? (Array.isArray(selectedFireworks) ? selectedFireworks : [selectedFireworks])
              : []
            ).map((fireworks: any, index: number) => (
              <View key={index} style={{ marginBottom: 16 }}>
                <Text style={styles.alertTitle}>
                  {fireworks.title}
                </Text>

                <Text style={styles.alertMessage}>
                  {fireworks.details}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setFireworksVisible(false)}
            >
              <Text style={styles.alertButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {checkingIn && (
        <View style={styles.loadingOverlay}>
          <LoadingPuck size={140} />
        </View>
      )}
      <ScrollView contentContainerStyle={styles.container}>
        {/* ← BACK BUTTON GOES RIGHT HERE */}
        <TouchableOpacity
          style={[
            styles.backButton,
            { top: insets.top + 10 }
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={[styles.header, { backgroundColor: arena.colorCode || '#0A2940' }]}>
          <Text style={styles.arenaName}>{arena.arena}</Text>
        </View>

        <View style={[styles.bannerWrapper, { marginBottom: 20 }]}>
          {bannerPhotoLoading ? (
            <View style={[styles.bannerImage, { justifyContent: 'center', alignItems: 'center' }]}>
              <LoadingPuck size={100} />
            </View>
          ) : sharedArenaPhotos.length > 0 ? (
            <ImageBackground
              source={{ uri: sharedArenaPhotos[0]?.photo }}
              style={styles.bannerImage}
              imageStyle={styles.bannerImageRadius}
            >
              <View style={styles.bannerOverlay} />
            </ImageBackground>
          ) : null}

          <View style={styles.bannerStatCard}>
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
              borderRadius: 60,
            }} />
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'transparent',
              borderRadius: 60,
              height: 120,
              width: 120,
              marginTop: -4,
              marginLeft: -4,
              borderWidth: colorScheme === 'dark' ? 4 : 0.1,
              borderColor: '#FFFFFF',
            }} />
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: lightColor,
              opacity: colorScheme === 'dark' ? 0 : 0.3,
              borderRadius: 60,
            }} />

            {visitLoading ? (
              <View style={{ justifyContent: "center", alignItems: "center", flex: 1 }}>
                <LoadingPuck size={120} />
              </View>
            ) : (
              <>
                <Text style={styles.statNumber}>{visitCount}</Text>
                <Text style={styles.statLabel}>Times Visited</Text>
                {lastVisitDate && (
                  <Text style={styles.lastVisitText}>
                    Last: {format(lastVisitDate, "MMM d, yyyy")}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>

        <View style={[styles.rankStrip, { borderColor }]}>
          <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
            borderRadius: 12,
          }} />
          <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: lightColor,
            opacity: colorScheme === 'dark' ? 0 : 0.9,
            borderRadius: 8,
          }} />

          <View style={styles.rankColumn}>
            {globalLoading ? (
              <LoadingPuck size={55} />
            ) : (
              <>
                <Text style={styles.rankNumber}>{globalCheckinCount}</Text>
                <Text style={styles.rankLabel}>Total Check-ins</Text>
              </>
            )}
          </View>

          <View style={styles.rankDivider} />

          <View style={styles.rankColumn}>
            {rankLoading ? (
              <LoadingPuck size={55} />
            ) : (
              <>
                <Text style={styles.rankNumber}>{arenaRank ? `#${arenaRank}` : '--'}</Text>
                <Text style={styles.rankLabel}>Ballpark Rank</Text>
              </>
            )}
          </View>
        </View>

        <View style={[styles.infoBox, { borderColor }]}>
        {/* Solid background */}
          <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
            borderRadius: 12,
          }} />
          {/* White border layer in dark mode */}
          <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'transparent',
            borderRadius: 12,
            borderWidth: colorScheme === 'dark' ? 1 : 0,
            borderColor: '#FFFFFF',
          }} />
          {/* Light tint overlay on top */}
          <View style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: lightColor,
            borderRadius: 8,
          }} />
          <Text style={styles.label}>Address</Text>
          <Text style={styles.value}>{arena.address}</Text>

          <Text style={styles.label}>Teams</Text>
          {(
            arenaData.filter(a =>
              (a.arena ?? '').trim().toLowerCase() === (arena.arena ?? '').trim().toLowerCase()
            ).length > 0
              ? arenaData.filter(a =>
                  (a.arena ?? '').trim().toLowerCase() === (arena.arena ?? '').trim().toLowerCase()
                )
              : historicalArenasData.filter(a =>
                  (a.arena ?? '').trim().toLowerCase() === (arena.arena ?? '').trim().toLowerCase()
                )
          ).map((a, index) => (
            <Text key={index} style={styles.value}>
              {a.teamName}
            </Text>
          ))}

          <Text style={styles.label}>Leagues</Text>
          {[
            ...new Set(
              (
                arenaData.filter(a =>
                  (a.arena ?? '').trim().toLowerCase() === (arena.arena ?? '').trim().toLowerCase()
                ).length > 0
                  ? arenaData.filter(a =>
                      (a.arena ?? '').trim().toLowerCase() === (arena.arena ?? '').trim().toLowerCase()
                    )
                  : historicalArenasData.filter(a =>
                      (a.arena ?? '').trim().toLowerCase() === (arena.arena ?? '').trim().toLowerCase()
                    )
              ).map(a => a.league)
            )
          ].map((league, index) => (
            <Text key={index} style={styles.value}>
              {league}
            </Text>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleDirections}>
          <Text style={styles.buttonText}>Get Directions</Text>
        </TouchableOpacity>

        {upcomingGames.length === 0 && (
          <View style={[styles.section, { borderColor }]}>
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
              borderRadius: 12,
            }} />
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: lightColor,
              opacity: 0.9,
              borderRadius: 12,
            }} />
            <Text style={styles.sectionTitle}>Upcoming Games</Text>
            <Text style={styles.value}>No Upcoming Games</Text>
          </View>
        )}

        {combinedSchedule.length === 0 ? (
          <View style={[styles.section, { borderColor }]}>
            <LoadingPuck size={80} />
          </View>
        ) : upcomingGames.length > 0 && (
          <View style={[styles.section, { borderColor }]}>
          {/* Solid background */}
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
              borderRadius: 12,
            }} />

            {/* White border layer in dark mode */}
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'transparent',
              borderRadius: 12,
              borderWidth: colorScheme === 'dark' ? 1 : 0,
              borderColor: '#FFFFFF',
            }} />

            {/* Light tint overlay on top */}
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: lightColor,
              opacity: colorScheme === 'dark' ? 0 : 0.9,
              borderRadius: 8,
            }} />
            <Text style={styles.sectionTitle}>Upcoming Games</Text>

            <View style={[styles.countdownBox, { backgroundColor: arena.colorCode || "#0A2940" }]}>
              <Text style={styles.countdownNumber}>{timeLeft}</Text>
              <Text style={styles.countdownLabel}>until next first pitch</Text>
            </View>

            {upcomingGames.map((game) => (
              <View key={game.id} style={styles.gameCard}>
                <Text style={styles.gameTextBold}>
                  {game.homeTeam} vs {game.awayTeam}
                </Text>

                <View style={styles.timeRow}>
                  {hasAppAccess && game.fireworks && (
                    <TouchableOpacity
                      style={styles.timeGiveawayButton}
                      onPress={() => {
                        setSelectedFireworks(game.fireworks);
                        setFireworksVisible(true);
                      }}
                    >
                      <Text style={styles.giveawayEmoji}>🎆 </Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.gameText}>
                    {format(new Date(game.date), 'EEE, MMM d – h:mm a')}
                  </Text>

                  {hasAppAccess && game.giveaway && (
                    <TouchableOpacity
                      style={styles.timeGiveawayButton}
                      onPress={() => {
                        setSelectedGiveaway(game.giveaway);
                        setGiveawayVisible(true);
                      }}
                    >
                      <Text style={styles.giveawayEmoji}>🎁</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {hasAppAccess ? (
          bannerPhotoLoading ? (
            <View style={[styles.section, { borderColor }]}>
              <LoadingPuck size={80} />
            </View>
          ) : sharedArenaPhotos[0]?.photo ? (
            <View style={[styles.section, { borderColor }]}>
              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
                borderRadius: 12,
              }} />

              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'transparent',
                borderRadius: 12,
                borderWidth: colorScheme === 'dark' ? 1 : 0,
                borderColor: '#FFFFFF',
              }} />

              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: lightColor,
                opacity: colorScheme === 'dark' ? 0 : 0.9,
                borderRadius: 8,
              }} />

              <Text style={styles.sectionTitle}>Fan Photos</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sharedArenaPhotos.map((photo) => (
                  <View key={photo.id} style={styles.fanPhotoCard}>
                    <TouchableOpacity onPress={() => setSelectedPhoto(photo.photo)}>
                      <Image source={{ uri: photo.photo }} style={styles.fanPhotoThumb} />
                    </TouchableOpacity>

                    <Text style={styles.tipUserName}>
                      {(photo.userName || '').slice(0, 13)}
                    </Text>

                    <TouchableOpacity style={styles.cheerButton} onPress={() => handlePhotoCheer(photo.id)}>
                      <Text style={styles.cheerText}>
                        {cheeredPhotos.includes(photo.id) ? 'Cheered🎉' : 'Cheer🎉'} {photo.cheerCount}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={[styles.section, { borderColor }]}>
              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
                borderRadius: 12,
              }} />

              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'transparent',
                borderRadius: 12,
                borderWidth: colorScheme === 'dark' ? 1 : 0,
                borderColor: '#FFFFFF',
              }} />

              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: lightColor,
                opacity: colorScheme === 'dark' ? 0 : 0.9,
                borderRadius: 8,
              }} />

              <Text style={styles.sectionTitle}>Fan Photos</Text>
              <Text style={styles.value}>No fan photos shared yet for this ballpark.</Text>
            </View>
          )
        ) : (
          <View style={[styles.section, { borderColor }]}>
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
              borderRadius: 12,
            }} />

            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'transparent',
              borderRadius: 12,
              borderWidth: colorScheme === 'dark' ? 1 : 0,
              borderColor: '#FFFFFF',
            }} />

            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: lightColor,
              opacity: colorScheme === 'dark' ? 0 : 0.9,
              borderRadius: 8,
            }} />

            <Text style={styles.sectionTitle}>Fan Photos</Text>
            <Text style={styles.premiumLockText}><Text style={styles.premiumLockText}>Premium unlocks fan photos at this ballpark.</Text></Text>
          </View>
        )}

        {hasAppAccess ? (
          tipsLoading ? (
            <View style={[styles.section, { borderColor }]}>
              <LoadingPuck size={80} />
            </View>
          ) : sharedTips.length > 0 ? (
            <View style={[styles.section, { borderColor }]}>
              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
                borderRadius: 12,
              }} />

              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'transparent',
                borderRadius: 12,
                borderWidth: colorScheme === 'dark' ? 1 : 0,
                borderColor: '#FFFFFF',
              }} />

              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: lightColor,
                opacity: colorScheme === 'dark' ? 0 : 0.9,
                borderRadius: 8,
              }} />

              <Text style={styles.sectionTitle}>Fan Tips</Text>

              <Text style={styles.sectionTitle}>Parking & Travel</Text>
              {sharedTips
                .filter(tip => tip.shareParkingTip && tip.ParkingAndTravel?.trim() !== '')
                .map((tip) => (
                  <View key={`parking-${tip.id}`} style={styles.tipCard}>
                    <View style={styles.tipUserRow}>
                      <Image
                        source={
                          tip.userPhoto
                            ? { uri: tip.userPhoto }
                            : require('@/assets/images/icon.png')
                        }
                        style={styles.tipUserPhoto}
                      />
                      <Text style={styles.tipUserName}>{tip.userName}</Text>
                    </View>
                    <Text style={styles.value}>{tip.ParkingAndTravel}</Text>
                  </View>
                ))}

              {sharedTips.some(tip => tip.sharePregameBar && tip.pregameBar?.trim() !== '') && (
                <>
                  <Text style={styles.sectionTitle}>Pregame Bar</Text>
                  {sharedTips
                    .filter(tip => tip.sharePregameBar && tip.pregameBar?.trim() !== '')
                    .map((tip) => (
                      <View key={`bar-${tip.id}`} style={styles.tipCard}>
                        <View style={styles.tipUserRow}>
                          <Image
                            source={
                              tip.userPhoto
                                ? { uri: tip.userPhoto }
                                : require('@/assets/images/icon.png')
                            }
                            style={styles.tipUserPhoto}
                          />
                          <Text style={styles.tipUserName}>{tip.userName}</Text>
                        </View>
                        <Text style={styles.value}>{tip.pregameBar}</Text>
                      </View>
                    ))}
                </>
              )}
            </View>
          ) : (
            <View style={[styles.section, { borderColor }]}>
              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
                borderRadius: 12,
              }} />

              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: 'transparent',
                borderRadius: 12,
                borderWidth: colorScheme === 'dark' ? 1 : 0,
                borderColor: '#FFFFFF',
              }} />

              <View style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: lightColor,
                opacity: colorScheme === 'dark' ? 0 : 0.9,
                borderRadius: 8,
              }} />

              <Text style={styles.sectionTitle}>Fan Tips</Text>
              <Text style={styles.value}>No fan tips shared yet for this ballpark.</Text>
            </View>
          )
        ) : (
          <View style={[styles.section, { borderColor }]}>
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: colorScheme === 'dark' ? (arena.colorCode || '#0D2C42') : '#FFFFFF',
              borderRadius: 12,
            }} />

            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'transparent',
              borderRadius: 12,
              borderWidth: colorScheme === 'dark' ? 1 : 0,
              borderColor: '#FFFFFF',
            }} />

            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: lightColor,
              opacity: colorScheme === 'dark' ? 0 : 0.9,
              borderRadius: 8,
            }} />

            <Text style={styles.sectionTitle}>Fan Tips</Text>
            <Text style={styles.premiumLockText}>Premium unlocks fan tips at this ballpark.</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            { opacity: combinedSchedule.length === 0 ? 0.5 : 1 }
          ]}
          onPress={handleCheckIn}
          disabled={checkingIn || combinedSchedule.length === 0}
        >
          <Text style={styles.buttonText}>
            {combinedSchedule.length === 0
              ? 'Loading Schedule...'
              : checkingIn
                ? 'Checking in...'
                : 'Check-in to live game'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!selectedPhoto} transparent animationType="fade">
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity style={styles.photoModalClose} onPress={() => setSelectedPhoto(null)}>
            <Text style={styles.photoModalCloseText}>✕</Text>
          </TouchableOpacity>

          <Image source={{ uri: selectedPhoto || '' }} style={styles.photoModalImage} />
        </View>
      </Modal>

    </ImageBackground>
  );
}