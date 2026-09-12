//baseball//(tabs)/home.tsx
import { format } from 'date-fns';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Clipboard, Dimensions, FlatList, Image, ImageBackground, Linking, Modal, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useColorScheme } from '../../hooks/useColorScheme';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { usePremium } from '@/context/PremiumContext';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

import LoadingPuck from '@/components/loadingPuck';
import { loadArenas } from '@/utils/loadArenas';
import { loadLeagues } from '@/utils/loadLeagues';
import { loadSchedule } from '@/utils/loadSchedule';

const auth = getAuth();

export default function HomeScreen() {
  const user = auth.currentUser;
  const router = useRouter();
  const { hasFullAccess, isInTrial, isLoadingPremium } = usePremium();
  const hasAppAccess = hasFullAccess || isInTrial;
  const colorScheme = useColorScheme();
  const backgroundSource = colorScheme === 'dark' ? require('../../assets/images/background_dark.jpg') : require('../../assets/images/background.jpg');
  const [location, setLocation] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [filterMode, setFilterMode] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('All Groups');
  const [exploreFilterMode, setExploreFilterMode] = useState('all');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [nextPuckDrop, setNextPuckDrop] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [distanceUnit, setDistanceUnit] = useState<'miles' | 'km'>('miles');
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[]>([]);
  const today = new Date().toDateString();
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<Array<{ id: string; name: string; imageUrl?: string; arenas: number; teams: number }>>([]);
  const [globalLbLoading, setGlobalLbLoading] = useState(true);
  const [teamPopularityLeaderboard, setTeamPopularityLeaderboard] = useState<Array<{ teamName: string; count: number }>>([]);
  const [teamPopularityLoading, setTeamPopularityLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'arenas' | 'teams' | 'team_popularity'>('arenas');
  const [myFriends, setMyFriends] = useState<string[]>([]);
  const [arenaData, setArenaData] = useState<any[]>([]);
  const [combinedSchedule, setCombinedSchedule] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [leaguesData, setLeaguesData] = useState<any[]>([]);
  const leaderboardShotRef = useRef<ViewShot>(null);
  const [dropdownVisible,setDropdownVisible]=useState(false);
  const [giveawayVisible, setGiveawayVisible] = useState(false);
  const [selectedGiveaway, setSelectedGiveaway] = useState<any>(null);
  const [fireworksVisible, setFireworksVisible] = useState(false);
  const [selectedFireworks, setSelectedFireworks] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setScheduleLoading(true);
      const data = await loadArenas();
      setArenaData(data);

      const leagues = await loadLeagues();
      setLeaguesData(leagues);

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

      setCombinedSchedule([
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
      ]);

      setScheduleLoading(false);
    };

    fetchData();
  }, []);

  // DEDUPE arenas so multi-team arenas only show once
  const getUniqueArenas = (arenas: any[]) => {
    const seen = new Map<string, any>();

    arenas.forEach(arena => {
      const key = `${arena.arena}_${arena.city}`;

      if (!seen.has(key)) {
        seen.set(key, arena);
      }
    });

    return Array.from(seen.values());
  };


  //Calculates distance between two coordinates in miles or km based on distanceUnit
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = distanceUnit === 'km' ? 6371 : 3958.8; // Earth radius
    const toRad = n => n * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const now = Date.now();
  const liveBufferMs = 3 * 60 * 60 * 1000;

  //Filters today's games from combinedSchedule by mode (all/favorites/league) and sorts by date
  const filteredGames = useMemo(() => {
    const games = combinedSchedule
      .filter(game => {
        const gameTime = new Date(game.date).getTime();
        return new Date(game.date).toDateString() === today && gameTime >= (now - liveBufferMs);
      });

    if (filterMode === 'favorites') {
      return games.filter(game => favoriteLeagues.includes(game.league)).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    if (filterMode === 'league' && selectedLeague) {
      return games.filter(game => game.league === selectedLeague).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return games.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [today, selectedLeague, filterMode, favoriteLeagues, combinedSchedule, now, liveBufferMs]);

  //Groups leagues for Explore Leagues picker and grid
  const leagueGroups = [
    {
      title: 'Major League',
      leagues: [
        { name: 'MLB', logo: require('@/assets/images/ball_logo_mlb.png') },
      ],
    },
    {
      title: 'Triple-A Leagues',
      leagues: [
        { name: 'IL', logo: require('@/assets/images/ball_logo_il.png') },
        { name: 'PCL', logo: require('@/assets/images/ball_logo_pcl.png') },
      ],
    },
    {
      title: 'Double-A Leagues',
      leagues: [
        { name: 'EL', logo: require('@/assets/images/ball_logo_el.png') },
        { name: 'SL', logo: require('@/assets/images/ball_logo_sl.png') },
        { name: 'TL', logo: require('@/assets/images/ball_logo_tl.png') },
      ],
    },
    {
      title: 'High-A Leagues',
      leagues: [
        { name: 'MWL', logo: require('@/assets/images/ball_logo_mwl.png') },
        { name: 'NWL', logo: require('@/assets/images/ball_logo_nwl.png') },
        { name: 'SAL', logo: require('@/assets/images/ball_logo_sal.png') },
      ],
    },
    {
      title: 'Single-A Leagues',
      leagues: [
        { name: 'FSL', logo: require('@/assets/images/ball_logo_fsl.png') },
        { name: 'CL', logo: require('@/assets/images/ball_logo_cl.png') },
        { name: 'CAL', logo: require('@/assets/images/ball_logo_cal.png') },
      ],
    },
    {
      title: 'Rookie Leagues',
      leagues: [
        { name: 'ACL', logo: require('@/assets/images/ball_logo_acl.png') },
        { name: 'FCL', logo: require('@/assets/images/ball_logo_fcl.png') },
        { name: 'DSL', logo: require('@/assets/images/ball_logo_dsl.png') },
      ],
    },
    {
      title: 'Independent Leagues',
      leagues: [
        { name: 'FL', logo: require('@/assets/images/ball_logo_fl.png') },
        { name: 'ALPB', logo: require('@/assets/images/ball_logo_alpb.png') },
        { name: 'AAPB', logo: require('@/assets/images/ball_logo_aapb.png') },
        { name: 'PL', logo: require('@/assets/images/ball_logo_pl.png') },
      ],
    },
    {
      title: 'International Leagues',
      leagues: [
        { name: 'NPB', logo: require('@/assets/images/ball_logo_npb.png') },
        { name: 'KBOL', logo: require('@/assets/images/ball_logo_kbol.png') },
        { name: 'CPBL', logo: require('@/assets/images/ball_logo_cpbl.png') },
        { name: 'LMB', logo: require('@/assets/images/ball_logo_lmb.png') },
        { name: 'ABL', logo: require('@/assets/images/ball_logo_abl.png') },
      ],
    },
  ];

  // Memoized list of leagues to display in Explore Leagues grid (favorites or all/group)
  const leaguesToShow = useMemo(() => {
    if (exploreFilterMode === 'favorites') {
      return leagueGroups
        .flatMap(g => g.leagues)
        .filter(league => favoriteLeagues.includes(league.name));
    }

    return selectedGroup === 'All Groups'
      ? leagueGroups.flatMap(g => g.leagues)
      : leagueGroups.find(g => g.title === selectedGroup)?.leagues || [];
  }, [exploreFilterMode, selectedGroup, favoriteLeagues]);

  // Opens Google Maps directions to the arena (with accent-insensitive matching)
  const handleDirections = async (arenaName) => {
    try {
      if (!arenaName) return;

      const normalize = (str: string) =>
        str
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const normalizedInput = normalize(arenaName);

      const arenaInfo = arenaData.find(a => {
        const normalizedDB = normalize(a.arena);
        return (
          normalizedDB === normalizedInput ||
          normalizedDB.includes(normalizedInput) ||
          normalizedInput.includes(normalizedDB.split(' (')[0])
        );
      });

      if (!arenaInfo) {
        setAlertMessage('Ballpark location not found.');
        setAlertVisible(true);
        return;
      }

      const url = `https://www.google.com/maps/dir/?api=1&destination=${arenaInfo.latitude},${arenaInfo.longitude}`;

      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        setAlertMessage('Unable to open maps.');
        setAlertVisible(true);
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      setAlertMessage('Failed to open directions.');
      setAlertVisible(true);
    }
  };


  // Navigates to live check-in screen with game details
  const handleCheckIn = async (game) => {
    setCheckingIn(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCheckingIn(false);
        setAlertMessage('Location is required to check in.');
        setAlertVisible(true);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 5000,
      });

      const arena = arenaData.find(a =>
        (a.arena === game.arena || a.arena === game.location) &&
        a.league === game.league
      );

      if (!arena) {
        setCheckingIn(false);
        setAlertMessage('Arena not found for this game.');
        setAlertVisible(true);
        return;
      }

      const now = new Date().getTime();
      const start = new Date(game.date).getTime();
      const twoHoursBefore = start - (2 * 60 * 60 * 1000);
      const fourHoursAfter = start + (4 * 60 * 60 * 1000);
      const insideLiveWindow = now >= twoHoursBefore && now <= fourHoursAfter;

      if (!insideLiveWindow) {
        setCheckingIn(false);
        setAlertMessage('This game is not currently within the live check-in window.');
        setAlertVisible(true);
        return;
      }

      const distance = getDistance(
        location.coords.latitude,
        location.coords.longitude,
        arena.latitude,
        arena.longitude
      );

      const threshold = distanceUnit === 'km' ? 0.45 : 0.28;

      if (distance > threshold) {
        setCheckingIn(false);
        setAlertMessage('Not close enough to the ballpark. You need to be at the ballpark.');
        setAlertVisible(true);
        return;
      }

      setCheckingIn(false);

      router.push({
        pathname: '/checkin/live',
        params: {
          league: game.league,
          arenaName: arena.arena,
          homeTeam: game.homeTeam || game.team,
          opponent: game.opponent || game.awayTeam,
          gameDate: game.date,
        },
      });

    } catch (error) {
      setCheckingIn(false);
      setAlertMessage('Could not get your location. Try again.');
      setAlertVisible(true);
    }
  };

  const loadGlobalLeaderboard = async () => {
    setGlobalLbLoading(true);

    try {
      const leaderboardSnap = await getDocs(collection(db, 'publicLeaderboard'));
      const leaderboard = leaderboardSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setGlobalLeaderboard(leaderboard);
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        setAlertMessage('Unable to load leaderboard.');
        setAlertVisible(true);
      } else if (error?.code === 'unauthenticated') {
        setAlertMessage('Session expired. Please log in again.');
        setAlertVisible(true);
      }

      setGlobalLeaderboard([]);
    } finally {
      setGlobalLbLoading(false);
    }
  };

  const loadTeamPopularityLeaderboard = async () => {
    setTeamPopularityLoading(true);

    try {
      const leaderboardSnap = await getDocs(collection(db, 'teamPopularity'));

      const leaderboard = leaderboardSnap.docs
        .map(docSnap => ({
          teamName: docSnap.id,
          count: docSnap.data().count || 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTeamPopularityLeaderboard(leaderboard);
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        setAlertMessage('Unable to load team popularity leaderboard.');
        setAlertVisible(true);
      } else if (error?.code === 'unauthenticated') {
        setAlertMessage('Session expired. Please log in again.');
        setAlertVisible(true);
      }

      setTeamPopularityLeaderboard([]);
    } finally {
      setTeamPopularityLoading(false);
    }
  };

  const handleShareLeaderboard = async () => {
    try {
      if (!leaderboardShotRef.current) {
        setAlertMessage('Unable to capture leaderboard.');
        setAlertVisible(true);
        return;
      }

      const uri = await leaderboardShotRef.current.capture();

      if (!uri) {
        setAlertMessage('Capture failed.');
        setAlertVisible(true);
        return;
      }

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        setAlertMessage('Sharing is not available on this device.');
        setAlertVisible(true);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
      });
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        setAlertMessage('Sharing permission denied.');
        setAlertVisible(true);
      } else {
        setAlertMessage('Failed to share leaderboard.');
        setAlertVisible(true);
      }
    }
  };

  //Redirects to user's saved startup tab on app resume
  useEffect(() => {
    if (!user) return;

    const loadStartupTab = async () => {
      try {
        const snap = await getDoc(doc(db, 'profiles', user.uid));
        if (!snap.exists()) return;
        const saved = snap.data()?.startupTab;
        if (!saved || saved === 'home') return;
        const target =
          {
            profile: 'profile',
            checkin: 'checkin',
            map: 'map',
            friends: 'friends',
          }[saved];

        if (target) {
          router.replace(`/${target}`);
        }
      } catch (error: any) {
        if (error?.code === 'permission-denied') {
          setAlertMessage('Unable to read startup preferences.');
          setAlertVisible(true);
        } else if (error?.code === 'unauthenticated') {
          setAlertMessage('Session expired. Please log in again.');
          setAlertVisible(true);
        }
      }
    };

    loadStartupTab();
  }, []);

  //Pulsing fade animation for "Detecting location..." placeholder
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  //Requests location permission and gets current position on mount
  useEffect(() => {
    const loadLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 10000,
          timeout: 5000,
        });

        if (loc?.coords) {
          setLocation(loc.coords);
        }
      } catch (error: any) {
        if (error?.code === 'E_LOCATION_UNAUTHORIZED') {
          setAlertMessage('Location access denied.');
          setAlertVisible(true);
        }
      }
    };

    loadLocation();
  }, []);

  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'profiles', user.uid);
    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();

          if (Array.isArray(data?.favouriteTeams)) {
            setFavoriteTeams(data.favouriteTeams);
          } else {
            setFavoriteTeams([]);
          }
        } else {
          setFavoriteTeams([]);
        }
      },
      (error: any) => {
        if (!auth.currentUser) return;
        if (error?.code === 'permission-denied') {
          setAlertMessage('Unable to read favourite teams.');
          setAlertVisible(true);
        } else if (error?.code === 'unauthenticated') {
          setAlertMessage('Session expired. Please log in again.');
          setAlertVisible(true);
        }
      }
    );

    return () => unsub();
  }, []);

  //Loads saved Today's Games filter (All/Favorites/league) from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('gameFilterMode').then(savedMode => savedMode && setFilterMode(savedMode));
    AsyncStorage.getItem('selectedLeague').then(savedLeague => savedLeague && setSelectedLeague(savedLeague));
  }, []);

  //Saves Today's Games filter to AsyncStorage when filterMode or selectedLeague changes
  useEffect(() => {
    if (filterMode === 'all') {
      AsyncStorage.multiRemove(['gameFilterMode', 'selectedLeague']);
    } else if (filterMode === 'favorites') {
      AsyncStorage.setItem('gameFilterMode', 'favorites');
      AsyncStorage.removeItem('selectedLeague');
    } else if (filterMode === 'league') {
      AsyncStorage.multiSet([['gameFilterMode', 'league'], ['selectedLeague', selectedLeague || '']]);
    }
  }, [filterMode, selectedLeague]);

  //Updates "next puck drop" countdown every second based on combinedSchedule
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const upcoming = combinedSchedule
        .filter(g => new Date(g.date) > now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

      if (!upcoming) return setNextPuckDrop('No games scheduled');

      const diff = new Date(upcoming.date) - now;

      if (diff > 5 * 60 * 1000) {
        const hours = Math.floor(diff / (3600000));
        const minutes = Math.floor((diff % 3600000) / 60000);
        setNextPuckDrop(`${hours}h ${minutes}m until the next pitch!`);
      } else {
        const totalSeconds = Math.floor(diff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setNextPuckDrop(`Next pitch in: ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [combinedSchedule]);

  // Loads saved selected league from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('selectedLeague').then(saved => saved && setSelectedLeague(saved));
  }, []);

  // Saves selected league to AsyncStorage when it changes
  useEffect(() => {
    selectedLeague === null
      ? AsyncStorage.removeItem('selectedLeague')
      : AsyncStorage.setItem('selectedLeague', selectedLeague);
  }, [selectedLeague]);

  // Listens for distance unit (miles/km) changes in user profile and updates state
  useEffect(() => {
    const profileRef = doc(db, 'profiles', user.uid);

    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const unit = snap.data().distanceUnit === 'km' ? 'km' : 'miles';
          setDistanceUnit(unit);
        }
      },
      (error: any) => {
        if (!auth.currentUser) return;
        if (error?.code === 'permission-denied') {
          setAlertMessage('Unable to read distance preference.');
          setAlertVisible(true);
        } else if (error?.code === 'unauthenticated') {
          setAlertMessage('Session expired. Please log in again.');
          setAlertVisible(true);
        }
      }
    );

    return () => unsub();
  }, []);

  // Loads favorite leagues on mount and listens for real-time updates from Firestore
  useEffect(() => {
    const profileRef = doc(db, 'profiles', user.uid);

    const loadInitialFavoriteLeagues = async () => {
      try {
        const snap = await getDoc(profileRef);

        if (snap.exists() && Array.isArray(snap.data()?.favoriteLeagues)) {
          setFavoriteLeagues(snap.data().favoriteLeagues);
        } else {
          setFavoriteLeagues([]);
        }
      } catch (error: any) {
        if (error?.code === 'permission-denied') {
          setAlertMessage('Unable to read favorite leagues.');
          setAlertVisible(true);
        } else if (error?.code === 'unauthenticated') {
          setAlertMessage('Session expired. Please log in again.');
          setAlertVisible(true);
        }
      }
    };

    loadInitialFavoriteLeagues();

    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists() && Array.isArray(snap.data()?.favoriteLeagues)) {
          setFavoriteLeagues(snap.data().favoriteLeagues);
        } else {
          setFavoriteLeagues([]);
        }
      },
      (error: any) => {
        if (!auth.currentUser) return;
        if (error?.code === 'permission-denied') {
          setAlertMessage('Unable to read favorite leagues.');
          setAlertVisible(true);
        } else if (error?.code === 'unauthenticated') {
          setAlertMessage('Session expired. Please log in again.');
          setAlertVisible(true);
        }
      }
    );

    return () => unsub();
  }, []);

  //Loads saved Explore Leagues filter (favorites or group) from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('exploreFilterMode').then(savedMode => {
      if (savedMode === 'favorites') {
        setExploreFilterMode('favorites');
      } else {
        setExploreFilterMode('all');
        AsyncStorage.getItem('exploreSelectedGroup').then(savedGroup => savedGroup && setSelectedGroup(savedGroup));
      }
    });
  }, []);

  //Saves Explore Leagues filter (favorites or selected group) to AsyncStorage when changed
  useEffect(() => {
    if (exploreFilterMode === 'favorites') {
      AsyncStorage.setItem('exploreFilterMode', 'favorites');
      AsyncStorage.removeItem('exploreSelectedGroup');
    } else {
      AsyncStorage.removeItem('exploreFilterMode');
      AsyncStorage.setItem('exploreSelectedGroup', selectedGroup);
    }
  }, [exploreFilterMode, selectedGroup]);

  useEffect(() => {
    const friendsRef = collection(db, 'profiles', user.uid, 'friends');

    const unsub = onSnapshot(
      friendsRef,
      (snap) => {
        const friendIds = snap.docs.map(doc => doc.id);
        setMyFriends(friendIds);
      },
      (error: any) => {
        if (!auth.currentUser) return;
        if (error?.code === 'permission-denied') {
          setAlertMessage('Unable to load friends list.');
          setAlertVisible(true);
        } else if (error?.code === 'unauthenticated') {
          setAlertMessage('Session expired. Please log in again.');
          setAlertVisible(true);
        }
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    loadGlobalLeaderboard();
    loadTeamPopularityLeaderboard();
  }, []);

  useEffect(() => {
    const ensurePublicLeaderboardDoc = async () => {
      if (!auth.currentUser) return;

      const userRef = doc(db, 'publicLeaderboard', auth.currentUser.uid);
      const profileRef = doc(db, 'profiles', auth.currentUser.uid);
      const checkinsRef = collection(db, 'profiles', auth.currentUser.uid, 'checkins');

      try {
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) return;

        const profileData = profileSnap.data();

        const checkinsSnap = await getDocs(checkinsRef);
        const checkins = checkinsSnap.docs.map(d => d.data());

        const arenas = new Set(
          checkins
            .map(c => {
              if (!c.arenaId || typeof c.arenaId !== 'string') return null;
              return c.arenaId.trim().toLowerCase();
            })
            .filter(Boolean)
        ).size;

        const teams = new Set(
          checkins.flatMap(c =>
            [c.teamName || c.team, c.opponent].filter(Boolean)
          )
        ).size;

        await setDoc(
          userRef,
          {
            name: profileData.name || 'Unknown',
            imageUrl: profileData.imageUrl || '',
            arenas,
            teams,
            favourites: Array.isArray(profileData.favouriteTeams)
              ? profileData.favouriteTeams.length
              : 0,
          },
          { merge: true }
        );
      } catch (error: any) {
        if (error?.code === 'permission-denied') {
          setAlertMessage('Unable to sync leaderboard profile.');
          setAlertVisible(true);
        }
      }
    };

    ensurePublicLeaderboardDoc();
  }, []);

  const styles = StyleSheet.create({
    adContainer:{width:Dimensions.get('window').width-20,alignSelf:'center',alignItems:'center',marginBottom:16},
    alertOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center',padding:20},
    alertContainer:{backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF',borderRadius:16,padding:24,width:'100%',maxWidth:340,alignItems:'center',borderWidth:3,borderColor:colorScheme==='dark'?'#B22222':'#B22222',shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.3,shadowRadius:16,elevation:16},
    alertTitle:{fontSize:18,fontWeight:'700',color:colorScheme==='dark'?'#FFFFFF':'#1D3557',textAlign:'center',marginBottom:12},
    alertMessage:{fontSize:15,color:colorScheme==='dark'?'#AFC7E6':'#374151',textAlign:'center',marginBottom:24,lineHeight:22},
    alertButton:{backgroundColor:colorScheme==='dark'?'#2E5A8A':'#E0E7FF',borderWidth:2,borderColor:colorScheme==='dark'?'#4A6FA5':'#2F4F68',paddingVertical:12,paddingHorizontal:32,borderRadius:30},
    alertButtonText:{color:colorScheme==='dark'?'#FFFFFF':'#1D3557',fontWeight:'700',fontSize:16},
    arenaCard:{backgroundColor:colorScheme==='dark'?'#243B5A':'#FFFFFF',padding:12,borderRadius:12,marginBottom:12,width:'100%',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.12,shadowRadius:6,elevation:6},
    background:{flex:1,width:'100%',height:'100%'},
    blurredSection:{opacity:0.75},
    buttonsRow:{flexDirection:'row',justifyContent:'space-between',marginTop:8},
    cardText:{fontSize:16,color:colorScheme==='dark'?'#F5F1E6':'#0D131F',textAlign:'center'},
    countdownMini:{fontSize:14,fontWeight:'600',color:colorScheme==='dark'?'#F5F1E6':'#0D131F',textAlign:'center',marginBottom:10,opacity:0.9},
    countdownLive:{fontSize:24,fontWeight:'900',color:'#B22222',letterSpacing:2,fontVariant:['tabular-nums']},
    distanceText:{fontWeight:'bold',color:colorScheme==='dark'?'#F5F1E6':'#1D3557'},
    dropdownContainer:{width:'100%',marginBottom:12,zIndex:10},
    dropdownHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:14,paddingHorizontal:18,backgroundColor:colorScheme==='dark'?'#243B5A':'#F5F1E6',borderWidth:3,borderRadius:16,borderColor:colorScheme==='dark'?'#B55555':'#B22222'},
    dropdownHeaderText:{color:colorScheme==='dark'?'#FFFFFF':'#1D3557',fontSize:17,fontWeight:'600',flex:1,textAlign:'center'},
    dropdownList:{backgroundColor:colorScheme==='dark'?'#243B5A':'#F5F1E6',borderLeftWidth:3,borderRightWidth:3,borderBottomWidth:3,borderBottomLeftRadius:16,borderBottomRightRadius:16,borderColor:colorScheme==='dark'?'#B55555':'#B22222'},
    dropdownItem:{paddingVertical:12,paddingHorizontal:18},
    dropdownItemText:{color:colorScheme==='dark'?'#FFFFFF':'#1D3557',fontSize:15,fontWeight:'500',textAlign:'center'},
    header:{fontSize:34,fontWeight:'bold',color:colorScheme==='dark'?'#F5F1E6':'#1D3557',marginTop:10,marginBottom:15,textAlign:'center',textShadowColor:colorScheme==='dark'?'#000000':'#ffffff',textShadowOffset:{width:1,height:1},textShadowRadius:2},
    hiddenPicker:{width:'100%',height:56,color:'transparent'},
    favoriteCardText:{fontSize:18,fontWeight:'400'},
    favoriteGameBorder:{borderWidth:3,borderRadius:10,borderColor:'#B22222'},
    filterChip:{backgroundColor:colorScheme==='dark'?'#2E5A8A':'#F5F1E6',paddingVertical:6,paddingHorizontal:12,borderRadius:20,marginRight:8},
    filterChipActive:{backgroundColor:'#B22222'},
    filterChipText:{fontSize:14,color:colorScheme==='dark'?'#F5F1E6':'#1D3557'},
    filterChipTextActive:{color:'#FFFFFF',fontWeight:'700'},
    gameCard:{flexDirection:'column',backgroundColor:colorScheme==='dark'?'#243B5A':'#F0F4F8',padding:12,borderRadius:10,marginBottom:10,width:'100%'},
    giveawayButton:{backgroundColor:'#FFD54A',width:40,height:40,borderRadius:20,borderWidth:2,borderColor:'#B22222',alignItems:'center',justifyContent:'center',marginHorizontal:6,marginTop:6},
    giveawayEmoji:{fontSize:24},
    innerContainer:{paddingTop:Constants.statusBarHeight+40,paddingHorizontal:20,minHeight:Dimensions.get('window')},
    lbAvatar:{width:36,height:36,borderRadius:18,marginRight:10},
    lbEmptyText:{textAlign:'center',color:colorScheme==='dark'?'#F5F1E6':'#C9D1D9',paddingVertical:20},
    lbName:{flex:1,fontSize:16,color:colorScheme==='dark'?'#F5F1E6':'#1D3557'},
    lbNameTop3:{fontWeight:'bold'},
    lbRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,paddingHorizontal:8,backgroundColor:colorScheme==='dark'?'#243B5A':'rgba(255,255,255,0.9)',borderRadius:10,marginBottom:6},
    lbRowTop3:{backgroundColor:colorScheme==='dark'?'#243B5A':'#F5F1E6',borderWidth:2,borderColor:'#1D3557'},
    lbScoreLabel:{fontSize:12,color:colorScheme==='dark'?'#F5F1E6':'#6B7280',fontWeight:'500'},
    lbScoreContainer:{flexDirection:'row',alignItems:'center',gap:4},
    lbScoreTop3:{fontWeight:'900'},
    lbScore:{fontSize:18,fontWeight:'bold',color:colorScheme==='dark'?'#F5F1E6':'#1D3557',minWidth:40,textAlign:'right'},
    lbTeamRowName:{flexDirection:'row',alignItems:'center',flex:1},
    leaderboardFooterShare:{alignItems:'center',marginTop:16},
    leagueFilter:{flexDirection:'row',marginBottom:10,paddingHorizontal:10},
    leagueGrid:{paddingHorizontal:8,rowGap:16,columnGap:8},
    leagueGridItem:{flex:1,maxWidth:'33.33%',minWidth:80,alignItems:'center',paddingHorizontal:4},
    leagueGridItemPressed:{transform:[{scale:0.95}],shadowOpacity:0.3,shadowRadius:8,elevation:8},
    leagueLogo:{width:60,height:60,marginBottom:6},
    leagueName:{fontSize:12,color:colorScheme==='dark'?'#F5F1E6':'#374151',textAlign:'center'},
    loadingOverlay:{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'center',alignItems:'center',zIndex:999},
    picker:{width:'100%',height:56,fontSize:16,color:colorScheme==='dark'?'#F5F1E6':'#000',backgroundColor:colorScheme==='dark'?'#2E5A8A':'white',paddingHorizontal:0,textAlign:'center',dropdownIconColor:colorScheme==='dark'?'#FFFFFF':'#0D131F'},
    pickerContainer:{height:40,borderWidth:2,borderColor:colorScheme==='dark'?'#F5F1E6':'#0D131F',borderRadius:12,overflow:'hidden',marginBottom:12,justifyContent:'center',alignItems:'center'},
    pickerOverlayTextContainer:{position:'absolute',left:12,right:40,top:0,bottom:0,justifyContent:'center'},
    pickerOverlayArrowContainer:{position:'absolute',right:12,top:0,bottom:0,justifyContent:'center',pointerEvents:'none'},
    pickerSelectedText:{color:colorScheme==='dark'?'#F5F1E6':'#1D3557',fontSize:16},
    pickerArrow:{color:colorScheme==='dark'?'#F5F1E6':'#1D3557'},
    placeholder:{fontSize:16,color:colorScheme==='dark'?'#F5F1E6':'#1D3557',textAlign:'center'},
    rank:{fontSize:16,fontWeight:'600',color:colorScheme==='dark'?'#F5F1E6':'#4B5563',width:50},
    rankGold:{color:colorScheme==='dark'?'#F5F1E6':'#1D3557',fontWeight:'bold'},
    scrollContainer:{flexGrow:1},
    section:{marginBottom:30,backgroundColor:colorScheme==='dark'?'#0D131F':'#F5F1E6',borderRadius:12,padding:12,borderWidth:4,borderColor:'#B22222'},
    sectionTitle:{fontSize:20,fontWeight:'700',color:colorScheme==='dark'?'#F5F1E6':'#1D3557',marginBottom:8,textAlign:'center'},
    smallButton:{backgroundColor:colorScheme==='dark'?'#2E5A8A':'#B22222',paddingVertical:10,paddingHorizontal:12,borderRadius:30,borderWidth:2,borderColor:colorScheme==='dark'?'#4A6FA5':'#B22222',flex:1,marginHorizontal:4,alignItems:'center'},
    smallButtonText:{color:'#F5F1E6',fontSize:12,fontWeight:'600'},
    tabButton:{flex:1,paddingVertical:8,paddingHorizontal:8,borderRadius:20,backgroundColor:colorScheme==='dark'?'#2E5A8A':'#E5E7EB',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colorScheme==='dark'?'#F5F1E6':'#D1D5DB'},
    tabActive:{backgroundColor:'#B22222'},
    tabText:{fontSize:12,color:colorScheme==='dark'?'#F5F1E6':'#000000',fontWeight:'600',textAlign:'center'},
    tabTextActive:{color:'#F5F1E6',fontWeight:'700'},
    tabRow:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:8,marginBottom:16},
    timeRow:{flexDirection:'row',justifyContent:'center',alignItems:'center'},
    timeGiveawayButton:{marginLeft:8},
    upgradePrompt:{color:'#B22222',fontSize:18,fontWeight:'bold',textAlign:'center',marginTop:12,paddingHorizontal:16},
  });

  const visibleGames = hasAppAccess
    ? filteredGames
    : filteredGames.filter(game => game.league === 'MLB').slice(0, 3);

  const bannerAdUnitId = __DEV__
    ? TestIds.BANNER
    : Platform.select({
        ios: 'ca-app-pub-9072339875136281/7636725087',
        android: 'ca-app-pub-9072339875136281/1375549001',
      });

  if (isLoadingPremium || arenaData.length === 0) {
    return <LoadingPuck size={120} />;
  }

  return (
    <ImageBackground source={backgroundSource} style={styles.background} resizeMode="cover">

      {checkingIn && (
        <View style={styles.loadingOverlay}>
          <LoadingPuck />
        </View>
      )}

      {/* CUSTOM THEMED ALERT MODAL */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>
              {alertMessage.includes('Location is required') ? 'Permission denied' :
               alertMessage.includes('Ballpark not found') ? 'Error' :
               alertMessage.includes('Could not get') ? 'Location failed' :
               'Cannot check in yet'}
            </Text>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity onPress={() => setAlertVisible(false)} style={styles.alertButton}>
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={giveawayVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            {(selectedGiveaway
              ? (Array.isArray(selectedGiveaway) ? selectedGiveaway : [selectedGiveaway])
              : []
            ).map((item: any, index: number) => (
              <View key={index} style={{ marginBottom: 16 }}>
                <Text style={styles.alertTitle}>
                  {item.title}
                </Text>

                <Text style={styles.alertMessage}>
                  {item.details}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setGiveawayVisible(false)}
              style={styles.alertButton}
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
            ).map((item: any, index: number) => (
              <View key={index} style={{ marginBottom: 16 }}>
                <Text style={styles.alertTitle}>
                  {item.title}
                </Text>

                <Text style={styles.alertMessage}>
                  {item.details}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setFireworksVisible(false)}
              style={styles.alertButton}
            >
              <Text style={styles.alertButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.innerContainer}>
            <Text style={styles.header}>MY BASEBALL PASSPORT</Text>
            <View style={styles.adContainer}>
              <BannerAd
                unitId={bannerAdUnitId}
                size={BannerAdSize.BANNER}
                requestOptions={{
                  requestNonPersonalizedAdsOnly: false,
                }}
              />
            </View>

            {/* Closest Arenas */}
            <View key="closest-arenas" style={styles.section}>
              <Text style={styles.sectionTitle}>Closest Ballpark</Text>

              {location ? getUniqueArenas(arenaData)
                .map(arena => ({
                  ...arena,
                  distance: getDistance(
                    location.latitude,
                    location.longitude,
                    arena.latitude,
                    arena.longitude
                  )
                }))
                .sort((a, b) => a.distance - b.distance)
                .slice(0, hasAppAccess ? 5 : 2)
                .map((arena, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.arenaCard}
                    onPress={() =>
                      router.push({
                        pathname: '/arenas/[arenaId]',
                        params: {
                          arenaId: `${arena.latitude.toFixed(6)}_${arena.longitude.toFixed(6)}`
                        }
                      })
                    }
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.cardText, { flex: 1 }]}>{arena.arena} – {arena.city}</Text>
                      <Text style={styles.distanceText}>
                        {Math.round(arena.distance) === arena.distance ? Math.round(arena.distance) : arena.distance.toFixed(1)} {distanceUnit === 'km' ? 'km' : 'mi'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
                : <Animated.Text style={[styles.placeholder, { opacity: fadeAnim }]}>Detecting location...</Animated.Text>
              }

              {!hasAppAccess && (
                <Text style={styles.upgradePrompt}>
                  Premium unlocks 5 nearby ballparks.
                </Text>
              )}
            </View>

            {/* Today's Games */}
            <View key="todays-games" style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Games</Text>
              <Text style={[styles.countdownMini, nextPuckDrop.includes(':') && styles.countdownLive]}>
                {nextPuckDrop || 'Loading...'}
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leagueFilter}>
                <TouchableOpacity onPress={() => { setFilterMode('favorites'); setSelectedLeague(null); }} style={[styles.filterChip, filterMode === 'favorites' && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, filterMode === 'favorites' && styles.filterChipTextActive]}>Favorites</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setSelectedLeague(null); setFilterMode('all'); }} style={[styles.filterChip, filterMode === 'all' && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, filterMode === 'all' && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>

                {leagueGroups.flatMap(group => group.leagues).map(league => (
                  <TouchableOpacity key={league.name} onPress={() => { setSelectedLeague(league.name); setFilterMode('league'); }} style={[styles.filterChip, selectedLeague === league.name && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, selectedLeague === league.name && styles.filterChipTextActive]}>{league.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {scheduleLoading ? (
                <LoadingPuck size={70} />
              ) : filteredGames.length === 0 ? (
                <Text style={styles.placeholder}>No games scheduled for today.</Text>
              ) : visibleGames.map((game, index) => (
                <View key={`${game.id}_${index}`} style={styles.gameCard}>
                  <View>
                    <Text style={styles.cardText}>
                      {(game.homeTeam || game.team)} vs {game.opponent || game.awayTeam}
                    </Text>

                    <Text style={styles.cardText}>
                      {game.arena}
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

                      <Text style={styles.cardText}>
                        {format(new Date(game.date), "h:mm a")}
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

                  <View style={styles.buttonsRow}>
                    <TouchableOpacity style={styles.smallButton} onPress={() => handleDirections(game.arena)}>
                      <Text style={styles.smallButtonText}>Get Directions</Text>
                    </TouchableOpacity>



                    <TouchableOpacity
                      style={[styles.smallButton, checkingIn && { opacity: 0.5 }]}
                      onPress={() => handleCheckIn(game)}
                      disabled={checkingIn}
                    >
                      <Text style={styles.smallButtonText}>Check-in</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {!hasAppAccess && (
                <Text style={styles.upgradePrompt}>
                  Premium unlocks every league schedule.
                </Text>
              )}
            </View>

            {/* Explore Leagues */}
            <View key="explore-leagues" style={styles.section}>
              <Text style={styles.sectionTitle}>Explore Leagues</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity style={styles.dropdownHeader} onPress={() => setDropdownVisible(prev => !prev)}>
                  <Text style={styles.dropdownHeaderText}>{exploreFilterMode === 'favorites' ? 'Favorites' : selectedGroup}</Text>
                  <Ionicons name={dropdownVisible ? 'chevron-up' : 'chevron-down'} size={24} color={colorScheme==='dark'?'#FFFFFF':'#1D3557'} />
                </TouchableOpacity>

                {dropdownVisible && (
                  <View style={styles.dropdownList}>
                    {['All Groups','Favorites',...leagueGroups.map(group => group.title)].map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={styles.dropdownItem}
                        onPress={() => {
                          opt === 'Favorites'
                            ? setExploreFilterMode('favorites')
                            : (setExploreFilterMode('all'), setSelectedGroup(opt));
                          setDropdownVisible(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <FlatList
                data={leaguesToShow}
                keyExtractor={item => item.name}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={styles.leagueGrid}
                renderItem={({ item }) => {
                  const locked = !hasAppAccess && item.name !== 'MLB';

                  return (
                    <Pressable
                      disabled={locked}
                      style={({ pressed }) => [
                        styles.leagueGridItem,
                        pressed && !locked && styles.leagueGridItemPressed,
                        locked && { opacity: 0.35 }
                      ]}
                      onPress={() => {
                        if (!locked) {
                          router.push(`/leagues/${item.name}`);
                        }
                      }}
                    >
                      <Image source={item.logo} style={styles.leagueLogo} resizeMode="contain" />
                      <Text style={styles.leagueName}>
                        {leaguesData.find(l => l.league === item.name)?.leagueName || item.name}
                      </Text>
                    </Pressable>
                  );
                }}
              />
              {!hasAppAccess && (
                <Text style={styles.upgradePrompt}>
                  Premium unlocks every league worldwide.
                </Text>
              )}
            </View>

            {/* Global Leaderboard */}
            <ViewShot
              ref={leaderboardShotRef}
              options={{
                format: 'png',
                quality: 0.9,
              }}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>Global Leaderboard</Text>

              <View style={styles.tabRow}>
                <TouchableOpacity
                  onPress={() => setActiveTab('arenas')}
                  style={[styles.tabButton, activeTab === 'arenas' && styles.tabActive]}
                >
                  <Text style={[styles.tabText, activeTab === 'arenas' && styles.tabTextActive]}>
                    Most Ballparks Visited
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('teams')}
                  style={[styles.tabButton, activeTab === 'teams' && styles.tabActive]}
                >
                  <Text style={[styles.tabText, activeTab === 'teams' && styles.tabTextActive]}>
                    Most Teams Watched
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('team_popularity')}
                  style={[styles.tabButton, activeTab === 'team_popularity' && styles.tabActive]}
                >
                  <Text style={[styles.tabText, activeTab === 'team_popularity' && styles.tabTextActive]}>
                    Most Favorited Teams
                  </Text>
                </TouchableOpacity>
              </View>

              {globalLbLoading || teamPopularityLoading ? (
                <ActivityIndicator size="small" color="#0D2C42" />
              ) : activeTab === 'team_popularity' ? (
                teamPopularityLeaderboard.length === 0 ? (
                  <Text style={styles.lbEmptyText}>
                    No favourite teams set yet
                  </Text>
                ) : (
                  teamPopularityLeaderboard.map((item, index) => (
                    <View key={item.teamName} style={[styles.lbRow, index < 3 && styles.lbRowTop3]}>
                      <Text style={[styles.rank, index < 3 && styles.rankGold]}>
                        {index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}.`}
                      </Text>

                      <View style={styles.lbTeamRowName}>
                        <Text style={[styles.lbName, index < 3 && styles.lbNameTop3]}>
                          {item.teamName}
                        </Text>
                      </View>

                      <View style={styles.lbScoreContainer}>
                        <Text style={[styles.lbScore, index < 3 && styles.lbScoreTop3]}>
                          {item.count}
                        </Text>
                        <Text style={styles.lbScoreLabel}>
                          fans
                        </Text>
                      </View>
                    </View>
                  ))
                )
              ) : globalLeaderboard.length === 0 ? (
                <Text style={styles.lbEmptyText}>
                  No check-ins yet
                </Text>
              ) : (
                globalLeaderboard
                  .sort((a, b) => {
                    if (activeTab === 'arenas') return b.arenas - a.arenas;
                    if (activeTab === 'teams') return b.teams - a.teams;
                    return 0;
                  })
                  .slice(0, 5)
                  .map((user, index) => {
                    const score = activeTab === 'arenas' ? user.arenas : user.teams;
                    const isFriendOrMe = myFriends.includes(user.id) || user.id === auth.currentUser?.uid;

                    if (!user) {
                      return null;
                    }

                    return (
                      <View key={user.id} style={[styles.lbRow, index < 3 && styles.lbRowTop3]}>
                        <Text style={[styles.rank, index < 3 && styles.rankGold]}>
                          {index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}.`}
                        </Text>

                        {isFriendOrMe ? (
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                            onPress={() => router.push(`/userprofile/${user.id}`)}
                          >
                            <Image
                              source={user.imageUrl ? { uri: user.imageUrl } : require('@/assets/images/icon.png')}
                              style={styles.lbAvatar}
                            />
                            <Text style={[styles.lbName, index < 3 && styles.lbNameTop3]}>
                              {user.name}{user.id === auth.currentUser?.uid ? ' (You)' : ''}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Image
                              source={user.imageUrl ? { uri: user.imageUrl } : require('@/assets/images/icon.png')}
                              style={styles.lbAvatar}
                            />
                            <Text style={[styles.lbName, index < 3 && styles.lbNameTop3]}>
                              {user.name}
                            </Text>
                          </View>
                        )}

                        <View style={styles.lbScoreContainer}>
                          <Text style={[styles.lbScore, index < 3 && styles.lbScoreTop3]}>
                            {score}
                          </Text>
                          <Text style={styles.lbScoreLabel}>
                            {activeTab === 'arenas' ? 'ballparks' : 'teams'}
                          </Text>
                        </View>
                      </View>
                    );
                  })
              )}

              <View style={styles.leaderboardFooterShare}>
                <TouchableOpacity onPress={handleShareLeaderboard}>
                  <Ionicons name="share-social" size={28} color={colorScheme === 'dark' ? '#FFFFFF' : '#0A2940'} />
                </TouchableOpacity>
              </View>
            </ViewShot>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}