//baseball//app/checkin/manual.tsx
import Checkbox from 'expo-checkbox';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from "expo-router";
import { AntDesign } from '@expo/vector-icons';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, onSnapshot, serverTimestamp, setDoc, increment } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseApp from '../../firebaseConfig';
import React, { useEffect, useState, } from 'react';
import { Alert, KeyboardAvoidingView, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropDownPicker from 'react-native-dropdown-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorScheme } from '../../hooks/useColorScheme';
import LoadingPuck from '@/components/loadingPuck';
import { usePremium } from '@/context/PremiumContext';

import { loadArenas } from '@/utils/loadArenas';
import localHistoricalTeamsData from '../../assets/data/historicalTeams.json';
import { loadHistoricalTeams } from '@/utils/loadHistoricalTeams';
import { loadArenaHistory } from '@/utils/loadArenaHistory';

const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp, 'gs://mybaseballpassport.firebasestorage.app');

// Resolve physical arena (lat/lng) from a historical arena name + date
const resolveArenaLatLng = (
  arenaName: string,
  league: string,
  date: Date
) => {
  const historyMatch = arenaHistoryData.find(h =>
    h.league === league &&
    h.history.some(rec => {
      if (rec.name !== arenaName) return false;
      const from = new Date(rec.from);
      const to = rec.to ? new Date(rec.to) : null;
      return date >= from && (!to || date <= to);
    })
  );

  if (!historyMatch) return null;

  const arena = arenasData.find(a =>
    a.league === league && a.teamName === historyMatch.teamName
  );

  return arena
    ? { latitude: arena.latitude, longitude: arena.longitude }
    : null;
};

const isSeasonValid = (item: any, selectedDate: Date) => {
  if (!item.seasonStart || !item.seasonEnd) return true;

   const monthDay =
     String(selectedDate.getMonth() + 1).padStart(2, '0') +
     '-' +
     String(selectedDate.getDate()).padStart(2, '0');

     return monthDay >= item.seasonStart && monthDay <= item.seasonEnd;
   };

const ManualCheckIn = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const auth = getAuth(firebaseApp);
  const user = auth.currentUser;
  if (!user) return null;
  const { hasFullAccess, isInTrial, isSubscribed, checkInCount } = usePremium();
  const hasAppAccess = hasFullAccess || isInTrial;
  const [friendsList, setFriendsList] = useState<{ id: string; name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredFriends, setFilteredFriends] = useState<{ id: string; name: string }[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [gameDate, setGameDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [arenas, setArenas] = useState<any[]>([]);
  const [rawArenas, setRawArenas] = useState<any[]>([]);
  const [allArenas, setAllArenas] = useState<any[]>([]);
  const [arenaHistoryData, setArenaHistoryData] = useState<any[]>([]);
  const [historicalTeamsData, setHistoricalTeamsData] = useState(localHistoricalTeamsData);
  const [leagueOpen, setLeagueOpen] = useState(false);
  const [arenaOpen, setArenaOpen] = useState(false);
  const [homeTeamOpen, setHomeTeamOpen] = useState(false);
  const [opponentTeamOpen, setOpponentTeamOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedArena, setSelectedArena] = useState(null);
  const [selectedHomeTeam, setSelectedHomeTeam] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [extraInnings, setExtraInnings] = useState(false);
  const [favoritePlayer, setFavoritePlayer] = useState('');
  const [seatSection, setSeatSection] = useState('');
  const [seatRow, setSeatRow] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [companions, setCompanions] = useState('');
  const [highlights, setHighlights] = useState('');
  const [parkingAndTravel, setParkingAndTravel] = useState('');
  const [shareParkingTip, setShareParkingTip] = useState(false);
  const [sharePregameBar, setSharePregameBar] = useState(false);
  const [pregameBar, setPregameBar] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sharedPhotos, setSharedPhotos] = useState<boolean[]>([]);
  const [didBuyMerch, setDidBuyMerch] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [merchItems, setMerchItems] = useState({});
  const [didBuyConcessions, setDidBuyConcessions] = useState(false);
  const [concessionItems, setConcessionItems] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(true);
  const merchCategories = {
    'Jerseys': ['Home Jersey', 'Away Jersey', 'Alternate Jersey', 'Retro Jersey', 'Custom Jersey', 'Player Jersey'],
    'Apparel & Headwear': ['T-shirt', 'Player T-shirt', 'Hoodie', 'Sweatshirt', 'Long sleeve shirt', 'Jacket','Snapback hat', 'Fitted cap', 'Dad hat', 'Baseball cap', 'Bucket hat','Beanie', 'Knit cap', 'Scarf', 'Gloves', 'Socks', 'Shorts','Pajama pants', 'Baby onesie', 'Toddler gear'],
    'Baseball Equipment & Souvenirs': ['Baseball', 'Mini bat', 'Replica bat', 'Foam finger', 'Batting helmet souvenir','Mini helmet', 'Signed baseball', 'Signed bat', 'Signed photo'],
    'Game-Used Items': ['Game-used baseball', 'Game-used bat', 'Game-worn jersey', 'Game-used lineup card'],
    'Toys & Collectibles': ['Bobblehead', 'Plush mascot', 'Team figurines', 'Keychain', 'Pin / lapel pin','Baseball cards', 'Souvenir coin / medallion', 'Mini stadium replica'],
    'Printed & Media': ['Team program', 'Poster', 'Schedule magnet', 'Wall calendar', 'Sticker set', 'Decals'],
    'Home & Lifestyle': ['Coffee mug', 'Water bottle', 'Beer glass', 'Koozie', 'Blanket','Pillow', 'Towel', 'Christmas ornament', 'Wall flag', 'Mousepad', 'Magnets' ],
    'Auto Accessories': ['Car flag', 'Window decal', 'Steering wheel cover', 'Seatbelt pad','Car magnet', 'Hitch cover', 'License plate frame'],
    'Bags & Utility': ['Drawstring bag', 'Backpack', 'Tote bag', 'Lanyard', 'Phone case', 'Wallet']
  };

  const concessionCategories = {
    'Classic Arena Fare': ['Hot Dog', 'Corn Dog', 'Bratwurst', 'Sausage', 'Nachos', 'Soft Pretzel', 'French Fries', 'Cheese Curds', 'Popcorn', 'Pizza Slice'],
    'Hot Food': ['Chicken Tenders', 'Buffalo Wings', 'Pulled Pork Sandwich', 'Cheeseburger', 'Veggie Burger', 'Loaded Fries', 'Mac and Cheese'],
    'Cold Food & Snacks': ['Sandwich', 'Salad', 'Fruit Cup', 'Chips', 'Granola Bar', 'Trail Mix', 'Candy', 'Chocolate Bar'],
    'Desserts & Treats': ['Ice Cream', 'Ice Cream Helmet', 'Dippin Dots', 'Funnel Cake', 'Mini Donuts', 'Cotton Candy', 'Churros', 'Cookies', 'Brownie'],
    'Non-Alcoholic Beverages': ['Soda', 'Bottled Water', 'Sports Drink', 'Lemonade', 'Iced Tea', 'Hot Chocolate', 'Coffee', 'Energy Drink'],
    'Alcoholic Beverages': ['Beer (Domestic)', 'Beer (Craft)', 'Cider', 'Hard Seltzer', 'Wine', 'Cocktail', 'Spiked Slushie']
  };

  useEffect(() => {
    const fetchData = async () => {
      const arenaData = await loadArenas();
      const historyData = await loadArenaHistory();
      const historicalData = await loadHistoricalTeams();

      setRawArenas(arenaData);
      setArenaHistoryData(historyData);

      if (historicalData.length > 0) {
        setHistoricalTeamsData(historicalData);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setAlertMessage('Session expired. Please log in again.');
        setAlertVisible(true);
        router.replace('/auth/login');
      }
    });
    return () => unsub();
  }, []);

  const [leagueItems, setLeagueItems] = useState([]);
  const [arenaItems, setArenaItems] = useState([]);
  const [homeTeamItems, setHomeTeamItems] = useState([]);
  const [opponentItems, setOpponentItems] = useState([]);

  const handleCheckInSubmit = async () => {

    if (!hasFullAccess && !isInTrial && checkInCount >= 3) {
      setAlertMessage('You have reached today’s free check-in limit. Upgrade to Premium for unlimited access or come back tomorrow.');
      setAlertVisible(true);
      setIsSubmitting(false);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const user = getAuth(firebaseApp).currentUser;
      if (!user) {
        setAlertMessage('You must be logged in to submit a check-in.');
        setAlertVisible(true);
        setIsSubmitting(false);
        return;
      }
      if (!selectedLeague || !selectedArena || !selectedHomeTeam || !selectedOpponent) {
        setAlertMessage('League, ballpark, home team and opponent are required.');
        setAlertVisible(true);
        setIsSubmitting(false);
        return;
      }

      if (homeScore && isNaN(Number(homeScore))) {
        setAlertMessage('Home score must be a valid number.');
        setAlertVisible(true);
        setIsSubmitting(false);
        return;
      }

      if (awayScore && isNaN(Number(awayScore))) {
        setAlertMessage('Away score must be a valid number.');
        setAlertVisible(true);
        setIsSubmitting(false);
        return;
      }

      const existingSnap = await getDocs(
        collection(db, 'profiles', user.uid, 'checkins')
      );

      const alreadyExists = existingSnap.docs.some(doc => {
        const data = doc.data();

        if (data.checkinType !== 'Manual') return false;

        const existingDate = new Date(data.gameDate);
        const newDate = gameDate;

        const sameDay =
          existingDate.getFullYear() === newDate.getFullYear() &&
          existingDate.getMonth() === newDate.getMonth() &&
          existingDate.getDate() === newDate.getDate();

        return (
          sameDay &&
          data.league === selectedLeague &&
          data.arenaName === selectedArena &&
          data.teamName === selectedHomeTeam &&
          data.opponent === selectedOpponent
        );
      });

      if (alreadyExists) {
        setAlertMessage('This game has already been checked in.');
        setAlertVisible(true);
        setIsSubmitting(false);
        return;
      }

      let photoUrls: string[] = [];

      if (images.length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const basePath = `checkins/${user.uid}/${timestamp}`;

        try {
          const uploadPromises = images.map(async (localUri, index) => {
            try {
              const response = await fetch(localUri);
              if (!response.ok) {
                throw new Error('Failed to read image file.');
              }

              const blob = await response.blob();
              const photoRef = ref(storage, `${basePath}/${index}.jpg`);

              await uploadBytes(photoRef, blob);

              const downloadUrl = await getDownloadURL(photoRef);
              return downloadUrl;

            } catch (innerError: any) {
              console.error('Image upload failed:', innerError);

              if (innerError?.code === 'permission-denied') {
                setAlertMessage('Permission denied while uploading photos.');
              } else if (innerError?.code === 'unauthenticated') {
                setAlertMessage('Session expired. Please log in again.');
              } else if (innerError?.message?.toLowerCase().includes('network')) {
                setAlertMessage('Network error during photo upload. Check connection and try again.');
              } else {
                setAlertMessage('Image upload failed. Please try again.');
              }

              setAlertVisible(true);
              return null;
            }
          });

          const uploadResults = await Promise.all(uploadPromises);
          photoUrls = uploadResults.filter((url) => typeof url === 'string');
        } catch (uploadError) {
          setIsSubmitting(false);
          return;
        }
      }

      const getSelectedItems = (sourceObject, categories) => {
        const result = {};
        Object.keys(categories).forEach((category) => {
          result[category] = categories[category].filter(
            (item) => sourceObject[item]
          );
        });
        return result;
      };

      const match = allArenas.find((arena: any) => {
        if (arena.league !== selectedLeague) return false;
        if (arena.teamName !== selectedHomeTeam) return false;

        const historyRecord = arenaHistoryData.find(h =>
          h.teamName === arena.teamName &&
          h.league === arena.league &&
          h.currentArena === arena.arena
        );

        let resolvedArena = arena.arena;

        if (historyRecord) {
          const record = historyRecord.history.find(h => {
            const from = new Date(h.from);
            const to = h.to ? new Date(h.to) : null;
            return gameDate >= from && (!to || gameDate <= to);
          });

          if (record) resolvedArena = record.name;
        }

        return resolvedArena === selectedArena;
      });

      const docData = {
        league: selectedLeague,
        arenaId: match?.arenaId ?? null,
        arenaName: selectedArena,
        teamName: selectedHomeTeam,
        opponent: selectedOpponent,
        homeScore: homeScore.trim() === '' ? null : Number(homeScore),
        awayScore: awayScore.trim() === '' ? null : Number(awayScore),
        extraInnings: extraInnings,
        favoritePlayer,
        seatInfo: {
          section: seatSection,
          row: seatRow,
          seat: seatNumber,
        },
        companions: companions,
        highlights,
        ParkingAndTravel: parkingAndTravel,
        shareParkingTip: shareParkingTip && parkingAndTravel.trim() !== '',
        pregameBar,
        sharePregameBar: sharePregameBar && pregameBar.trim() !== '',
        merchBought: getSelectedItems(merchItems, merchCategories),
        concessionsBought: getSelectedItems(concessionItems, concessionCategories),
        gameDate: gameDate.toISOString(),
        checkinType: 'Manual',
        photos: photoUrls,
        sharedPhotoFlags: photoUrls.map((_, index) => sharedPhotos[index] ? 1 : 0),
        userId: user.uid,
        timestamp: serverTimestamp(),
        latitude: typeof match?.latitude === 'number' ? match.latitude : null,
        longitude: typeof match?.longitude === 'number' ? match.longitude : null,
      };

      try {
        const checkinRef = await addDoc(collection(db, 'profiles', user.uid, 'checkins'), docData);
        await setDoc(
          doc(db, 'arenas', match?.arenaId ?? 'unknown', 'checkins', checkinRef.id),
          {
            arenaName: selectedArena,
            teamName: selectedHomeTeam,
            league: selectedLeague,
            timestamp: serverTimestamp(),
            userId: user.uid,
            shareParkingTip: shareParkingTip && parkingAndTravel.trim() !== '',
            ParkingAndTravel: parkingAndTravel,
            sharePregameBar: sharePregameBar && pregameBar.trim() !== '',
            pregameBar,
            photos: photoUrls,
            sharedPhotoFlags: photoUrls.map((_, index) => sharedPhotos[index] ? 1 : 0),
          }
        );

        if (match?.arenaId) {
          await setDoc(
            doc(db, 'arenas', match.arenaId),
            {
              totalCheckins: increment(1),
            },
            { merge: true }
          );
        }

        const today = new Date().toISOString().split('T')[0];
        await setDoc(
          doc(db, 'profiles', user.uid),
          {
            checkInCount: increment(1),
            [`dailyCheckInCounts.${today}`]: increment(1),
          },
          { merge: true }
        );

      } catch (writeError: any) {
        if (writeError?.code === 'permission-denied') {
          setAlertMessage('Permission denied while saving check-in.');
        } else if (writeError?.code === 'unauthenticated') {
          setAlertMessage('Session expired. Please log in again.');
        } else if (writeError?.message?.toLowerCase().includes('network')) {
          setAlertMessage('Network error while saving check-in. Check connection and try again.');
        } else {
          setAlertMessage('Failed to save check-in. Please try again.');
        }
        setAlertVisible(true);
        setIsSubmitting(false);
        return;
      }

      setAlertMessage('Check-in saved! Taking you to your profile...');
      setAlertVisible(true);

      setImages([]);

    } catch (error: any) {
      console.error('Error saving check-in:', error);

      if (error?.code === 'permission-denied') {
        setAlertMessage('Permission denied while saving check-in.');
      } else if (error?.code === 'unauthenticated') {
        setAlertMessage('Session expired. Please log in again.');
      } else if (error?.message?.toLowerCase().includes('network')) {
        setAlertMessage('Network error. Check connection and try again.');
      } else {
        setAlertMessage('Unexpected error occurred while saving.');
      }

      setAlertVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // League dropdown
  useEffect(() => {
    const selectedDate = gameDate;

    const processed = rawArenas
      .filter(arena => {
        const start = arena.startDate
          ? new Date(arena.startDate)
          : new Date(0);

        const end = arena.endDate
          ? new Date(arena.endDate)
          : null;

        if (end) end.setHours(23, 59, 59, 999);

        return (
          selectedDate >= start &&
          (!end || selectedDate <= end) &&
          isSeasonValid(arena, selectedDate)
        );
      })
      .map(arena => ({
        ...arena,
        league: arena.league?.trim() || null,
      }));

    const processedHistorical = historicalTeamsData
      .filter(hist => {
        const start = hist.startDate
          ? new Date(hist.startDate)
          : new Date(0);

        const end = hist.endDate
          ? new Date(hist.endDate)
          : null;

        if (end) end.setHours(23, 59, 59, 999);

        return (
          selectedDate >= start &&
          (!end || selectedDate <= end) &&
          isSeasonValid(hist, selectedDate)
        );
      })
      .map(hist => ({
        ...hist,
        league: hist.league?.trim() || null,
      }));

    const allArenasFiltered = [...processed, ...processedHistorical].filter(
      item =>
        item.league &&
        typeof item.league === 'string' &&
        item.league.trim() !== ''
    );

    setAllArenas(allArenasFiltered);
    setArenas(allArenasFiltered);

    const leagues = [
      ...new Set(allArenasFiltered.map(item => item.league))
    ].sort();

    setLeagueItems(
      leagues.map(league => ({
        label: league,
        value: league,
      }))
    );
  }, [gameDate, rawArenas, historicalTeamsData]);

  // League → set arenas & teams (uses historicalTeams.json via allArenas)
  useEffect(() => {
    if (!selectedLeague) {
      setArenaItems([]);
      setHomeTeamItems([]);
      setSelectedHomeTeam(null);
      setSelectedOpponent(null);
      setOpponentItems([]);
      return;
    }

    const selectedDate = gameDate;
    const validEntries = allArenas.filter(item => {
      if (item.league !== selectedLeague) return false;

      const start = item.startDate ? new Date(item.startDate) : new Date(0);
      const end = item.endDate ? new Date(item.endDate) : null;

      return selectedDate >= start && (!end || selectedDate <= end) && isSeasonValid(item, selectedDate);
    });

    const resolvedArenaNames = validEntries.map(item => {

      const historyRecord = arenaHistoryData.find(h =>
        h.teamName === item.teamName &&
        h.league === item.league
      );

      if (!historyRecord) {
        return item.arena;
      }

      const record = historyRecord.history.find(h => {
        const from = new Date(h.from);
        const to = h.to ? new Date(h.to) : null;
        return selectedDate >= from && (!to || selectedDate <= to);
      });

      return record ? record.name : item.arena;
    });

    const uniqueArenaNames = Array.from(new Set(resolvedArenaNames)).sort();

    setArenaItems(
      uniqueArenaNames.map(name => ({ label: name, value: name }))
    );


    const teamNames = Array.from(
      new Set(validEntries.map(a => a.teamName))
    ).sort();

    setHomeTeamItems(
      teamNames.map(name => ({ label: name, value: name }))
    );

    setSelectedOpponent(null);
    setOpponentItems([]);

  }, [selectedLeague, gameDate, allArenas]);

  // Arena selected — match INCLUDING history names
  useEffect(() => {
    if (!selectedArena || !selectedLeague) return;

    const selectedDate = gameDate;

    const teams = allArenas
      .filter(item => {
        if (item.league !== selectedLeague) return false;

        const historyRecord = arenaHistoryData.find(h =>
          h.teamName === item.teamName &&
          h.league === item.league &&
          h.currentArena === item.arena
        );

        let resolvedName = item.arena;

        if (historyRecord) {
          const record = historyRecord.history.find(h => {
            const from = new Date(h.from);
            const to = h.to ? new Date(h.to) : null;
            return selectedDate >= from && (!to || selectedDate <= to);
          });

          if (record) {
            resolvedName = record.name;
          }
        }

        return resolvedName === selectedArena;
      })
      .map(item => ({
        label: item.teamName,
        value: item.teamName,
      }));

    setHomeTeamItems(teams);

    if (
      selectedHomeTeam &&
      !teams.find(t => t.value === selectedHomeTeam)
    ) {
      setSelectedHomeTeam(null);
    }

  }, [selectedArena, selectedLeague, gameDate, allArenas]);

  // Home Team → Opponents (with date filter)
  useEffect(() => {
    if (selectedHomeTeam && selectedLeague && allArenas.length > 0 && gameDate) {
      const gameDateObj = new Date(gameDate);

      const opponentOptions = allArenas
        .filter(item => {
          if (item.league !== selectedLeague || item.teamName === selectedHomeTeam) return false;

          const start = item.startDate ? new Date(item.startDate) : new Date(0); // very early if no start
          const end = item.endDate ? new Date(item.endDate) : new Date(9999, 11, 31); // future if null

          return gameDateObj >= start && gameDateObj <= end;
        })
        .map(item => ({
          label: item.teamName,
          value: item.teamName,
        }));

      const uniqueOpponents = Array.from(
        new Map(opponentOptions.map(item => [item.value, item])).values()
      ).sort((a, b) => a.label.localeCompare(b.label));

      setOpponentItems(uniqueOpponents);
      setSelectedOpponent(null);
    } else {
      setOpponentItems([]);
    }
  }, [selectedHomeTeam, selectedLeague, arenas, gameDate]);

  useEffect(() => {
    if (!selectedHomeTeam || !selectedLeague) return;

    const matching = allArenas.filter(item =>
      item.league === selectedLeague &&
      item.teamName === selectedHomeTeam
    );

    const resolvedArenaNames = matching.map(item => {
      const historyRecord = arenaHistoryData.find(h =>
        h.teamName === item.teamName &&
        h.league === item.league &&
        h.currentArena === item.arena
      );

      if (!historyRecord) return item.arena;

      const record = historyRecord.history.find(h => {
        const from = new Date(h.from);
        const to = h.to ? new Date(h.to) : null;
        return gameDate >= from && (!to || gameDate <= to);
      });

      return record ? record.name : item.arena;
    });

    const uniqueArenaNames = Array.from(new Set(resolvedArenaNames)).sort();

    const arenaItemsList = uniqueArenaNames.map(name => ({
      label: name,
      value: name,
    }));

    setArenaItems(arenaItemsList);

    // ONLY reset selectedArena if it's no longer valid
    if (
      selectedArena &&
      !arenaItemsList.find(a => a.value === selectedArena)
    ) {
      setSelectedArena(null);
    }

  }, [selectedHomeTeam, selectedLeague, allArenas, gameDate]);



  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setAlertMessage('Permission required. Need access to photos to upload.');
      setAlertVisible(true);
      return;
    }

    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 3 - images.length,
      });
    } catch (error) {
      setAlertMessage('Failed to open image picker. Please try again.');
      setAlertVisible(true);
      return;
    }

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 3)); // enforce max 3
    }
  };

  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user) return;

    const friendsRef = collection(db, 'profiles', user.uid, 'friends');
    const unsub = onSnapshot(friendsRef, async (snap) => {
      const friendIds = snap.docs.map(d => d.id);

      const profiles = await Promise.all(
        friendIds.map(async (id) => {
          const profSnap = await getDoc(doc(db, 'profiles', id));
          const name = profSnap.data()?.name?.trim();
          return name ? { id, name } : null;
        })
      );

      setFriendsList(profiles.filter(Boolean));
    });

    return () => unsub();
  }, []);

  const styles = StyleSheet.create({
    alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    alertContainer: { backgroundColor: colorScheme === 'dark' ? '#0A2940' : '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', borderWidth: 3, borderColor: colorScheme === 'dark' ? '#666666' : '#2F4F68', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 16 },
    alertTitle: { fontSize: 18, fontWeight: '700', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', textAlign: 'center', marginBottom: 12 },
    alertMessage: { fontSize: 15, color: colorScheme === 'dark' ? '#CCCCCC' : '#374151', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    alertButton: { backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#E0E7FF', borderWidth: 2, borderColor: colorScheme === 'dark' ? '#666666' : '#2F4F68', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 30 },
    alertButtonText: { color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', fontWeight: '700', fontSize: 16 },
    bottomRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 32, marginTop: 24, },
    backIconButton: { backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#E0E7FF', padding: 14, borderRadius: 30, width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colorScheme === 'dark' ? '#666666' : '#2F4F68',  },
    container: { padding: 20, paddingBottom: 100, backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#FFFFFF', },
    categoryContainer: { marginBottom: 14, borderBottomWidth: 1, borderBottomColor: colorScheme === 'dark' ? '#334155' : '#E2E8F0', paddingBottom: 10, },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#F1F5F9', paddingHorizontal: 16, borderRadius: 8 },
    categoryTitle: { fontSize: 16, fontWeight: '600', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16 },
    checkboxLabel: { marginLeft: 12, fontSize: 15, color: colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42' },
    choiceButton: { borderWidth: 0, borderRadius: 30, paddingVertical: 8, paddingHorizontal: 16, marginRight: 10, },
    choiceButtonSelected: { backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#E0E7FF', borderWidth: 2, borderColor: colorScheme === 'dark' ? '#5E819F' : '#0D2C42', },
    choiceButtonTextSelected: { color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', fontWeight: '700', },
    choiceButtonText: { color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', fontSize: 16, fontWeight: '600', },
    companionsPlaceholder: { color: colorScheme === 'dark' ? '#BBBBBB' : '#666666' },
    datePickerText: { color: colorScheme === 'dark' ? '#BBBBBB' : '#0A2940' },
    dateModalContainer: { padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, },
    dateModalDone: { marginTop: 12, alignSelf: 'flex-end', },
    dateModalDoneText: { fontSize: 16, fontWeight: '600', color: '#0066CC', },
    dateModalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
    datePickerWrapper: { backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#FFFFFF', padding: 20, borderRadius: 12 },
    dropdown: { marginBottom: 14, borderColor: colorScheme === 'dark' ? '#334155' : '#0D2C42', borderWidth: 2, borderRadius: 8, paddingHorizontal: 8, backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF', },
    dropDownContainer: { backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF', borderColor: colorScheme === 'dark' ? '#334155' : '#E2E8F0' },
    dropDownText: { color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940' },
    dropDownListEmpty: { color: colorScheme === 'dark' ? '#BBBBBB' : '#666666' },
    dropdownPlaceholder: { color: colorScheme === 'dark' ? '#BBBBBB' : '#0A2940' },
    favoritePlayerPlaceholder: { color: colorScheme === 'dark' ? '#BBBBBB' : '#666666' },
    input: { borderWidth: 2, borderColor: colorScheme === 'dark' ? '#334155' : '#0D2C42', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF', },
    label: { fontSize: 16, fontWeight: '600', marginTop: 18, marginBottom: 6, color: colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42', },
    lockedInput: { opacity: 0.5, borderColor: 'red' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
    photoThumbnailWrapper: { position: 'relative', width: 100, minHeight: 132 },
    photoThumbnail: { width: 100, height: 100, borderRadius: 8 },
    Placeholder: { color: colorScheme === 'dark' ? '#BBBBBB' : '#666666' },
    requestContainer: { marginTop: 16, marginBottom: 8, alignItems: 'center', },
    requestQuestion: { fontSize: 15, color: colorScheme === 'dark' ? '#BBBBBB' : '#444444', textAlign: 'center', marginBottom: 4, },
    requestLinkText: { fontSize: 15, color: '#0066CC', textDecorationLine: 'underline', fontWeight: '600', },
    resultOptionsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12, },
    resultOptionItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, },
    resultOptionText: { marginLeft: 8, fontSize: 15, color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', },
    premiumLockText: { textAlign: 'center', marginBottom: 12, color: 'red', fontWeight: '600' },
    screenBackground: { flex: 1, backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#FFFFFF', },
    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    scoreLabel: { fontWeight: '500', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940' },
    scoreInput: { width: 60, textAlign: 'center', marginBottom: 0 },
    scrollContainer: { padding: 16, paddingBottom: 100, },
    seatInfoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 },
    seatLabel: { fontWeight: '500', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940' },
    seatLabelRow: { fontWeight: '500', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', marginLeft: 12, marginRight: 6 },
    seatInput: { width: 50, textAlign: 'center', marginBottom: 0 },
    shareToArenaText: { textAlign: 'center', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', marginTop: 8, marginBottom: 12, fontSize: 15, fontWeight: '500', },
    submitButton: { backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#E0E7FF', paddingVertical: 14, borderRadius: 30, width: '50%', alignSelf: 'center', alignItems: 'center', borderWidth: 2, borderColor: colorScheme === 'dark' ? '#666666' : '#2F4F68', },
    submitButtonSubmitting: { opacity: 0.7 },
    submitText: { color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', fontSize: 16, fontWeight: '600', },
    uploadPhotoText: { color: colorScheme === 'dark' ? '#BBBBBB' : '#0A2940' },
  });

  return (
    <View style={styles.screenBackground}>
      {/* CUSTOM THEMED ALERT MODAL */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>
              {alertMessage.includes('saved') ? 'Success' :
               alertMessage.includes('logged in') ? 'Login Required' : 'Error'}
            </Text>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity
              onPress={() => {
                setAlertVisible(false);
                if (alertMessage.includes('saved')) {
                  router.replace('/(tabs)/profile');
                }
              }}
              style={styles.alertButton}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <Stack.Screen options={{ title: "Manual Check-In" }} />
          <Text style={styles.label}>Game Date:</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.input}
          >
            <Text style={styles.datePickerText}>{gameDate.toDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker && Platform.OS === 'ios' && (
            <View
              style={{
                backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF',
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <DateTimePicker
                value={gameDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setGameDate(selectedDate);
                }}
              />

              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={{ alignSelf: 'flex-end', marginTop: 8 }}
              >
                <Text style={{ color: '#0066CC', fontWeight: '600', fontSize: 16 }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <DropDownPicker
            open={leagueOpen}
            value={selectedLeague}
            items={leagueItems}
            setOpen={setLeagueOpen}
            setValue={setSelectedLeague}
            setItems={setLeagueItems}
            placeholder="Select League"
            placeholderStyle={styles.dropdownPlaceholder}
            style={styles.dropdown}
            zIndex={5000}
            listMode="SCROLLVIEW"
            dropDownContainerStyle={styles.dropDownContainer}
            textStyle={styles.dropDownText}
            listEmptyTextStyle={styles.dropDownListEmpty}
            ListEmptyComponent={() => (
              <Text style={{ padding: 20, textAlign: "center", color: "#666" }}>
                You must pick a date first.
                </Text>
            )}
          />

          <DropDownPicker
            open={arenaOpen}
            value={selectedArena}
            items={arenaItems}
            setOpen={setArenaOpen}
            setValue={setSelectedArena}
            setItems={setArenaItems}
            placeholder="Select Ballpark"
            placeholderStyle={styles.dropdownPlaceholder}
            style={styles.dropdown}
            zIndex={4000}
            listMode="SCROLLVIEW"
            dropDownContainerStyle={styles.dropDownContainer}
            textStyle={styles.dropDownText}
            listEmptyTextStyle={styles.dropDownListEmpty}
            ListEmptyComponent={() => (
              <Text style={{ padding: 20, textAlign: "center", color: "#666" }}>
                Try selecting League first!
                What if you don't Know the Ballpark name? Try selecting Home team.
              </Text>
            )}
          />

          <DropDownPicker
            open={homeTeamOpen}
            value={selectedHomeTeam}
            items={homeTeamItems}
            setOpen={setHomeTeamOpen}
            setValue={setSelectedHomeTeam}
            setItems={setHomeTeamItems}
            placeholder="Select Home Team"
            placeholderStyle={styles.dropdownPlaceholder}
            style={styles.dropdown}
            zIndex={3000}
            listMode="SCROLLVIEW"
            dropDownContainerStyle={styles.dropDownContainer}
            textStyle={styles.dropDownText}
            listEmptyTextStyle={styles.dropDownListEmpty}
            ListEmptyComponent={() => (
              <Text style={{ padding: 20, textAlign: "center", color: "#666" }}>
                Try selecting League first!
              </Text>
            )}
          />

          <DropDownPicker
            open={opponentTeamOpen}
            value={selectedOpponent}
            items={opponentItems}
            setOpen={setOpponentTeamOpen}
            setValue={setSelectedOpponent}
            setItems={setOpponentItems}
            placeholder="Select Opponent"
            placeholderStyle={styles.dropdownPlaceholder}
            style={styles.dropdown}
            zIndex={2000}
            listMode="SCROLLVIEW"
            dropDownContainerStyle={styles.dropDownContainer}
            textStyle={styles.dropDownText}
            listEmptyTextStyle={styles.dropDownListEmpty}
            ListEmptyComponent={() => (
              <Text style={{ padding: 20, textAlign: "center", color: "#666" }}>
                Try selecting Home Team first!
              </Text>
            )}
          />

        <View style={{ marginTop: 5, alignItems: 'center' }}>
          <Pressable
            style={[
              styles.choiceButton,
              styles.choiceButtonSelected,
            ]}
            onPress={() => {
              setSelectedLeague(null);
              setSelectedArena(null);
              setSelectedHomeTeam(null);
              setSelectedOpponent(null);
              setArenaItems([]);
              setHomeTeamItems([]);
              setOpponentItems([]);
            }}
          >
            <Text style={styles.choiceButtonTextSelected}>
              Reset League, Ballpark, Home Team, Opponent
            </Text>
          </Pressable>
        </View>

        <View style={styles.requestContainer}>
          <Text style={styles.requestQuestion}>
            Can't find your league, ballpark or team?
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:support@mysportspassport.app?subject=Request%20New%20League%2FArena%2FTeam')}
          >
            <Text style={styles.requestLinkText}>
              Request it here
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Final Score:</Text>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>{'Home'}:</Text>
          <TextInput
            value={homeScore}
            onChangeText={setHomeScore}
            style={[styles.input, styles.scoreInput]}
            keyboardType="number-pad"
            placeholder=" "
          />
          <Text style={styles.scoreLabel}>{'  Away'}:</Text>
          <TextInput
            value={awayScore}
            onChangeText={setAwayScore}
            style={[styles.input, styles.scoreInput]}
            keyboardType="number-pad"
            placeholder=" "
          />
        </View>

        <View style={styles.resultOptionsRow}>
          <View style={styles.resultOptionItem}>
            <Checkbox
              value={extraInnings}
              onValueChange={setExtraInnings}
            />
            <Text style={styles.resultOptionText}>
              Extra Innings
            </Text>
          </View>
        </View>

          {hasAppAccess ? (
            <>
              <TextInput
                placeholder="Favorite Player"
                placeholderTextColor={styles.favoritePlayerPlaceholder.color}
                value={favoritePlayer}
                onChangeText={setFavoritePlayer}
                style={styles.input}
              />
              <Text style={styles.label}>Seat Information:</Text>
              <View style={styles.seatInfoRow}>
                <Text style={styles.seatLabel}>Section:</Text>
                <TextInput value={seatSection} onChangeText={setSeatSection} style={[styles.input, styles.seatInput]} />
                <Text style={styles.seatLabelRow}>Row:</Text>
                <TextInput value={seatRow} onChangeText={setSeatRow} style={[styles.input, styles.seatInput]} />
                <Text style={styles.seatLabelRow}>Seat:</Text>
                <TextInput value={seatNumber} onChangeText={setSeatNumber} style={[styles.input, styles.seatInput]} />
              </View>

              <TextInput
                placeholder="Who did you go with? (@ to tag friends)"
                placeholderTextColor={styles.Placeholder.color}
                value={companions}
                onChangeText={(text) => {
                  setCompanions(text);
                  const lastChar = text[text.length - 1];
                  const atIndex = text.lastIndexOf('@');

                  if (lastChar === '@' || (atIndex >= 0 && cursorPosition > atIndex)) {
                    const query = text.slice(atIndex + 1).toLowerCase().trim();
                    const matches = friendsList.filter(f => f.name.toLowerCase().includes(query));
                    setFilteredFriends(matches);
                    setShowSuggestions(matches.length > 0);
                  } else {
                    setShowSuggestions(false);
                  }
                }}
                onSelectionChange={(e) => setCursorPosition(e.nativeEvent.selection.start)}
                multiline
                style={styles.input}
              />

              {showSuggestions && (
                <View style={{
                  backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: colorScheme === 'dark' ? '#334155' : '#D1D5DB',
                  borderRadius: 8,
                  maxHeight: 200,
                  marginTop: 4,
                }}>
                  <ScrollView>
                    {filteredFriends.map((friend) => (
                      <TouchableOpacity
                        key={friend.id}
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: colorScheme === 'dark' ? '#334155' : '#E5E7EB',
                        }}
                        onPress={() => {
                          const beforeAt = companions.slice(0, companions.lastIndexOf('@'));
                          const newText = `${beforeAt}@${friend.name}`;
                          setCompanions(newText);
                          setShowSuggestions(false);
                        }}
                      >
                        <Text style={{ color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940' }}>
                          {friend.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          ) : (
            <>
              <TextInput
                placeholder="Favorite Player"
                placeholderTextColor={styles.favoritePlayerPlaceholder.color}
                editable={false}
                style={[styles.input, styles.lockedInput]}
              />
              <Text style={styles.label}>Seat Information:</Text>
              <View style={styles.seatInfoRow}>
                <Text style={styles.seatLabel}>Section:</Text>
                <TextInput editable={false} style={[styles.input, styles.lockedInput]} />
                <Text style={styles.seatLabelRow}>Row:</Text>
                <TextInput editable={false} style={[styles.input, styles.lockedInput]} />
                <Text style={styles.seatLabelRow}>Seat:</Text>
                <TextInput editable={false} style={[styles.input, styles.lockedInput]} />
              </View>
              <TextInput
                placeholder="Who did you go with?"
                placeholderTextColor={styles.Placeholder.color}
                editable={false}
                multiline
                style={[styles.input, styles.lockedInput]}
              />
              <Text style={styles.premiumLockText}>
                Upgrade to Premium to unlock favorite player, seat details, and companions.
              </Text>
            </>
          )}

          {hasAppAccess ? (
            <>
              <Text style={styles.label}>Upload Photos (up to 3):</Text>
              <TouchableOpacity style={styles.input} onPress={pickImage}>
                <Text style={styles.uploadPhotoText}>
                  {images.length === 0 ? 'Select Photos' : images.length < 3 ? 'Add More (max 3)' : 'Max 3 reached'}
                </Text>
              </TouchableOpacity>

              <View style={styles.photoGrid}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.photoThumbnailWrapper}>
                    <Image source={{ uri }} style={styles.photoThumbnail} resizeMode="cover" />

                    <View style={styles.sharePhotoRow}>
                      <Checkbox
                        value={sharedPhotos[index] || false}
                        onValueChange={(value) => {
                          const updated = [...sharedPhotos];
                          updated[index] = value;
                          setSharedPhotos(updated);
                        }}
                      />
                      <Text style={styles.checkboxLabel}>Share</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        setImages(images.filter((_, i) => i !== index));
                        setSharedPhotos(sharedPhotos.filter((_, i) => i !== index));
                      }}
                    >
                      <Text style={styles.deleteText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <Text style={styles.shareToArenaText}>
                Share to the ballpark page
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.label}>Upload Photos (up to 3):</Text>
              <View style={[styles.input, styles.lockedInput]}>
                <Text style={styles.uploadPhotoText}>Select Photos</Text>
              </View>
              <Text style={styles.premiumLockText}>
                Upgrade to Premium to unlock photo uploads.
              </Text>
            </>
          )}

          {hasAppAccess ? (
            <>
              <Text style={styles.label}>Did you buy any merch?</Text>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Pressable
                  style={[
                    styles.choiceButton,
                    didBuyMerch === true && styles.choiceButtonSelected,
                  ]}
                  onPress={() => setDidBuyMerch(true)}
                >
                  <Text style={[
                    styles.choiceButtonText,
                    didBuyMerch === true && styles.choiceButtonTextSelected
                  ]}>
                    Yes
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.choiceButton,
                    didBuyMerch === false && styles.choiceButtonSelected,
                  ]}
                  onPress={() => setDidBuyMerch(false)}
                >
                  <Text style={[
                    styles.choiceButtonText,
                    didBuyMerch === false && styles.choiceButtonTextSelected
                  ]}>
                    No
                  </Text>
                </Pressable>
              </View>

              {didBuyMerch && (
                <>
                  {Object.keys(merchCategories).map((category) => (
                    <View key={category} style={styles.categoryContainer}>
                      <Pressable
                        onPress={() =>
                          setExpandedCategories((prev) => ({
                            ...prev,
                            [category]: !prev[category],
                          }))
                        }
                        style={styles.categoryHeader}
                      >
                        <Text style={styles.categoryTitle}>{category}</Text>
                        <AntDesign
                          name={expandedCategories[category] ? 'up' : 'down'}
                          size={16}
                          color="black"
                        />
                      </Pressable>

                      {expandedCategories[category] &&
                        merchCategories[category].map((item) => (
                          <View key={item} style={styles.checkboxRow}>
                            <Checkbox
                              value={merchItems[item] || false}
                              onValueChange={(v) =>
                                setMerchItems((prev) => ({ ...prev, [item]: v }))
                              }
                            />
                            <Text style={styles.checkboxLabel}>{item}</Text>
                          </View>
                        ))}
                    </View>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              <Text style={styles.label}>Did you buy any merch?</Text>
              <View style={[styles.input, styles.lockedInput]}>
                <Text style={styles.uploadPhotoText}>Premium only</Text>
              </View>
              <Text style={styles.premiumLockText}>
                Upgrade to Premium to log merch purchases.
              </Text>
            </>
          )}

          {hasAppAccess ? (
            <>
              <Text style={styles.label}>Did you buy any concessions?</Text>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <Pressable
                  style={[
                    styles.choiceButton,
                    didBuyConcessions === true && styles.choiceButtonSelected,
                  ]}
                  onPress={() => setDidBuyConcessions(true)}
                >
                  <Text style={[
                    styles.choiceButtonText,
                    didBuyConcessions === true && styles.choiceButtonTextSelected
                  ]}>
                    Yes
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.choiceButton,
                    didBuyConcessions === false && styles.choiceButtonSelected,
                  ]}
                  onPress={() => setDidBuyConcessions(false)}
                >
                  <Text style={[
                    styles.choiceButtonText,
                    didBuyConcessions === false && styles.choiceButtonTextSelected
                  ]}>
                    No
                  </Text>
                </Pressable>
              </View>

              {didBuyConcessions && (
                <>
                  {Object.keys(concessionCategories).map((category) => (
                    <View key={category} style={styles.categoryContainer}>
                      <Pressable
                        onPress={() =>
                          setExpandedCategories((prev) => ({
                            ...prev,
                            [category]: !prev[category],
                          }))
                        }
                        style={styles.categoryHeader}
                      >
                        <Text style={styles.categoryTitle}>{category}</Text>
                        <AntDesign
                          name={expandedCategories[category] ? 'up' : 'down'}
                          size={16}
                          color="black"
                        />
                      </Pressable>

                      {expandedCategories[category] &&
                        concessionCategories[category].map((item) => (
                          <View key={item} style={styles.checkboxRow}>
                            <Checkbox
                              value={concessionItems[item] || false}
                              onValueChange={(v) =>
                                setConcessionItems((prev) => ({ ...prev, [item]: v }))
                              }
                            />
                            <Text style={styles.checkboxLabel}>{item}</Text>
                          </View>
                        ))}
                    </View>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              <Text style={styles.label}>Did you buy any concessions?</Text>
              <View style={[styles.input, styles.lockedInput]}>
                <Text style={styles.uploadPhotoText}>Premium only</Text>
              </View>
              <Text style={styles.premiumLockText}>
                Upgrade to Premium to log concessions.
              </Text>
            </>
          )}

          {hasAppAccess ? (
            <>
              <TextInput
                placeholder="Highlights"
                placeholderTextColor={styles.Placeholder.color}
                value={highlights}
                onChangeText={setHighlights}
                style={styles.input}
                multiline
              />

              <TextInput
                placeholder="Parking and travel Tips"
                placeholderTextColor={styles.Placeholder.color}
                value={parkingAndTravel}
                onChangeText={setParkingAndTravel}
                style={styles.input}
                multiline
              />

              <View style={styles.checkboxRow}>
                <Checkbox value={shareParkingTip} onValueChange={setShareParkingTip} />
                <Text style={styles.checkboxLabel}>Share this parking/travel tip on the ballpark page</Text>
              </View>

              <TextInput
                placeholder="Pregame Bar (where did you eat or drink before the game?)"
                placeholderTextColor={styles.Placeholder.color}
                value={pregameBar}
                onChangeText={setPregameBar}
                style={styles.input}
                multiline
              />

              <View style={styles.checkboxRow}>
                <Checkbox value={sharePregameBar} onValueChange={setSharePregameBar} />
                <Text style={styles.checkboxLabel}>Share this pregame Bar tip on the ballpark page</Text>
              </View>
            </>
          ) : (
            <>
              <TextInput
                placeholder="Highlights"
                placeholderTextColor={styles.Placeholder.color}
                editable={false}
                style={[styles.input, styles.lockedInput]}
                multiline
              />

              <TextInput
                placeholder="Parking and travel Tips"
                placeholderTextColor={styles.Placeholder.color}
                editable={false}
                style={[styles.input, styles.lockedInput]}
                multiline
              />

              <TextInput
                placeholder="Pregame Bar"
                placeholderTextColor={styles.Placeholder.color}
                editable={false}
                style={[styles.input, styles.lockedInput]}
                multiline
              />

              <Text style={styles.premiumLockText}>
                Upgrade to Premium to add notes, travel tips, and pregame details.
              </Text>
            </>
          )}

          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.backIconButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28} color={colorScheme === 'dark' ? '#FFFFFF' : '#0A2940'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonSubmitting
              ]}
              onPress={handleCheckInSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <LoadingPuck size={32} />
                  <Text style={styles.submitText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ANDROID — keep native behavior */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={gameDate}
              mode="date"
              display="calendar"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setGameDate(selectedDate);
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ManualCheckIn;