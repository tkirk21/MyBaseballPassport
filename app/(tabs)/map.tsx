// app/(tabs)/map.tsx
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import firebaseApp from '@/firebaseConfig';
import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile, Callout } from 'react-native-maps';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { usePremium } from '@/context/PremiumContext';

import { loadArenas } from '@/utils/loadArenas';
import { loadArenaHistory } from '@/utils/loadArenaHistory';
import { loadHistoricalTeams } from '@/utils/loadHistoricalTeams';
import LoadingPuck from "../../components/loadingPuck";

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

export default function MapScreen() {
  const user = auth.currentUser;
  const [pins, setPins] = useState<any[]>([]);
  const [arenasData, setArenasData] = useState<any[]>([]);
  const [arenaHistoryData, setArenaHistoryData] = useState<any[]>([]);
  const [historicalTeamsData, setHistoricalTeamsData] = useState<any[]>([]);
  const { hasFullAccess, isInTrial } = usePremium();
  const colorScheme = useColorScheme();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<string>('All');
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[]>([]);
  const [leagueOptions, setLeagueOptions] = useState<string[]>(['All']);
  const mapRef = useRef<MapView>(null);
  const viewShotRef = useRef<ViewShot>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArenaCheckIns, setSelectedArenaCheckIns] = useState<any[]>([]);
  const [allCheckIns, setAllCheckIns] = useState<any[]>([]);
  const [travelCoords, setTravelCoords] = useState<{latitude: number, longitude: number}[]>([]);
  const router = useRouter();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showTravelLines, setShowTravelLines] = useState(false);
  const [travelAnimValue, setTravelAnimValue] = useState(0);
  const showTravel = showTravelLines && travelCoords.length > 1;

  const handleShare = async () => {
    if (!user) return;

    try {
      await new Promise(r => setTimeout(r, 500));

      if (!viewShotRef.current) {
        setAlertMessage('Unable to capture map.');
        setAlertVisible(true);
        return;
      }

      let uri;
      try {
        uri = await viewShotRef.current.capture();
      } catch {
        setAlertMessage('Map capture failed.');
        setAlertVisible(true);
        return;
      }

      if (!uri) {
        setAlertMessage('Map capture failed.');
        setAlertVisible(true);
        return;
      }

      const fileUri = FileSystem.cacheDirectory + `map_${Date.now()}.png`;

      try {
        await FileSystem.copyAsync({ from: uri, to: fileUri });
      } catch {
        setAlertMessage('Failed to prepare image for sharing.');
        setAlertVisible(true);
        return;
      }

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        setAlertMessage('Sharing is not available on this device.');
        setAlertVisible(true);
        return;
      }

      const shareText =
        `Just added another ballpark to my Baseball Passport\n` +
        `Track every ballpark you visit.\n` +
        `https://play.google.com/store/apps/details?id=com.tkirk21.MyBaseballPassport`;

      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Share your map',
        mimeType: 'image/png',
        UTI: 'public.png',
        message: shareText
      });

    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        setAlertMessage('Sharing permission denied.');
      } else if (error?.code === 'unauthenticated') {
        setAlertMessage('Session expired. Please log in again.');
      } else {
        setAlertMessage('Could not share map.');
      }
      setAlertVisible(true);
    }
  };

  const isDateInRange = (
    checkDate: Date,
    start: string | undefined,
    end: string | undefined,
    seasonStart?: string,
    seasonEnd?: string
  ) => {
    if (!start) return false;
    const checkTime = checkDate.getTime();
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Infinity;

    const historicalValid = checkTime >= startTime && checkTime <= endTime;

    if (!historicalValid) return false;

    if (seasonStart && seasonEnd) {
      const monthDay =
        String(checkDate.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(checkDate.getDate()).padStart(2, '0');

      return monthDay >= seasonStart && monthDay <= seasonEnd;
    }

    return true;
  };

  const visiblePins = useMemo(() => {
    if (selectedLeague === 'Favorites') {
      return pins.filter(pin =>
        favoriteLeagues.some(fav =>
          fav.toUpperCase() === String(pin.league || '').toUpperCase()
        )
      );
    }
    return selectedLeague === 'All'
      ? pins
      : pins.filter(p => String(p.league || '').toUpperCase() === selectedLeague.toUpperCase());
  }, [pins, selectedLeague, favoriteLeagues]);

  const norm = (s: string) => (s ?? '').toString().trim().toLowerCase();

  const getCurrentArenaName = (oldName: string) => {
    if (!oldName) return oldName;
    const lowerOld = norm(oldName);
    for (const h of arenaHistoryData) {
      if (h.history.some((e: any) => norm(e.name) === lowerOld)) {
        return h.currentArena;
      }
    }
    return oldName;
  };

  const visitCountMap = useMemo(() => {
    const map = new Map<string, number>();

    allCheckIns.forEach(ci => {
      const arenaKey = norm(getCurrentArenaName(ci.arenaName || ''));
      map.set(arenaKey, (map.get(arenaKey) || 0) + 1);
    });

    return map;
  }, [allCheckIns]);

  const checkInsByArena = useMemo(() => {
    const map = new Map<string, any[]>();

    allCheckIns.forEach(ci => {
      const key = norm(getCurrentArenaName(ci.arenaName || ''));
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(ci);
    });

    return map;
  }, [allCheckIns]);

  useEffect(() => {
    const fetchData = async () => {
      const arenas = await loadArenas();
      setArenasData(arenas);

      const history = await loadArenaHistory();
      const historicalTeams = await loadHistoricalTeams();

      setArenaHistoryData(history);
      setHistoricalTeamsData(historicalTeams);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('mapSelectedLeague');
      if (saved) setSelectedLeague(saved);
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('mapSelectedLeague', selectedLeague);
  }, [selectedLeague]);

  useEffect(() => {
    if (!user) return;

    const profileRef = doc(db, 'profiles', user.uid);

    const loadFavoriteLeagues = async () => {
      try {
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          const saved = docSnap.data()?.favoriteLeagues;
          if (Array.isArray(saved)) {
            setFavoriteLeagues(saved);
          } else {
            setFavoriteLeagues([]);
          }
        } else {
          setFavoriteLeagues([]);
        }
      } catch (error: any) {
        if (error?.code === 'permission-denied') {
          setAlertMessage('Unable to read favorite leagues.');
        } else if (error?.code === 'unauthenticated') {
          setAlertMessage('Session expired. Please log in again.');
        } else {
          setAlertMessage('Failed to load favorite leagues.');
        }
        setAlertVisible(true);
      }
    };

    loadFavoriteLeagues();

    const unsub = onSnapshot(
      profileRef,
      (snap) => {
        if (snap.exists()) {
          const saved = snap.data()?.favoriteLeagues;
          if (Array.isArray(saved)) {
            setFavoriteLeagues(saved);
          } else {
            setFavoriteLeagues([]);
          }
        } else {
          setFavoriteLeagues([]);
        }
      },
      (error: any) => {
        if (!auth.currentUser) return;
        if (error?.code === 'permission-denied') {
          setAlertMessage('Unable to read favorite leagues.');
        } else if (error?.code === 'unauthenticated') {
          setAlertMessage('Session expired. Please log in again.');
        } else {
          setAlertMessage('Realtime update failed.');
        }
        setAlertVisible(true);
      }
    );

    return () => unsub();
  }, [user]);


  // Travel line animation when toggling
  useEffect(() => {
    if (!showTravelLines) {
      setTravelAnimValue(0);
      return;
    }

    setTravelAnimValue(0);

    let start = Date.now();
    const duration = 60000;
    let animationId: number;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setTravelAnimValue(progress);

      if (progress < 1 && showTravelLines) {
        animationId = requestAnimationFrame(tick);
      }
    };

    animationId = requestAnimationFrame(tick);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [showTravelLines]);

  const groupedCheckIns = useMemo(() => {
    if (selectedArenaCheckIns.length === 0) return [];

    const groups = new Map<string, any[]>();

    selectedArenaCheckIns.forEach(ci => {
      const oldName = ci.arenaName || 'Unknown';

      // Group purely by the original name that was used in the check-in
      const groupKey = oldName;

      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(ci);
    });

    // Sort each group's check-ins newest → oldest
    groups.forEach(list => {
      list.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());
    });

    // Build the result array
    const result: { name: string; checkIns: any[] }[] = [];
    groups.forEach((checkIns, name) => {
      result.push({ name, checkIns });
    });

    // Sort the groups themselves by the newest check-in in each group (newest group on top)
    result.sort((a, b) => {
      const newestA = new Date(a.checkIns[0].gameDate).getTime(); // a.checkIns[0] is newest in its group
      const newestB = new Date(b.checkIns[0].gameDate).getTime();
      return newestB - newestA; // descending = newest group first
    });

    return result;
  }, [selectedArenaCheckIns]);

  useEffect(() => {
    const loadEverything = async () => {

      try {
        let snapshot;
        try {
          const q = query(collection(db, 'profiles', user.uid, 'checkins'));
          snapshot = await getDocs(q);
        } catch (error: any) {
          if (error?.code === 'permission-denied') {
            setAlertMessage('Permission denied while loading check-ins.');
          } else if (error?.code === 'unauthenticated') {
            setAlertMessage('Session expired. Please log in again.');
          } else if (error?.message?.includes('network') || error?.code === 'unavailable') {
            setAlertMessage('Network error while loading check-ins.');
          } else {
            setAlertMessage('Failed to load check-ins.');
          }
          setAlertVisible(true);
          setLoading(false);
          return;
        }

        const all: any[] = [];
        const seenArenas = new Set<string>();
        const markers: any[] = [];

        snapshot.forEach(doc => {
          const data = doc.data();
          all.push({ id: doc.id, ...data });

          const currentArenaName = getCurrentArenaName(data.arenaName);
          const key = `${data.arenaName}-${data.gameDate}`;

          if (seenArenas.has(key)) return;
          seenArenas.add(key);

          let displayName = data.arenaName || 'Arena';
          let lat = data.latitude;
          let lng = data.longitude;
          let colorCode = 'red';
          let teamCode = '';

          let match = (arenasData as any[]).find(
            (a: any) => a.league === data.league && a.arena === data.arenaName
          );

          if (!match && data.arenaName) {
            const historyEntry = arenaHistoryData.find((h: any) =>
              h.history.some((entry: any) => norm(entry.name) === norm(data.arenaName))
            );
            if (historyEntry) {
              match = (arenasData as any[]).find(
                (a: any) => a.arena === historyEntry.currentArena && a.league === data.league
              );
              displayName = historyEntry.currentArena;
            }
          }

          if (match) {
            lat = match.latitude;
            lng = match.longitude;
            colorCode = match.colorCode || 'red';
            teamCode = match.teamCode || '';
          } else {
            // Try historical teams json for old/defunct teams
            let historicalMatch: any = null;

            // First priority: exact arena name match (catches one-offs like LoanDepot perfectly)
            historicalMatch = historicalTeamsData.find((h: any) =>
              norm(h.arena) === norm(data.arenaName) &&
              isDateInRange(
                new Date(data.gameDate),
                h.startDate,
                h.endDate,
                h.seasonStart,
                h.seasonEnd
              )
            );

            if (!historicalMatch && data.teamName && data.gameDate) {
              const gameDateObj = new Date(data.gameDate);

              const candidates = historicalTeamsData
                .filter((h: any) =>
                  norm(data.teamName).includes(norm(h.teamName)) ||
                  norm(h.teamName).includes(norm(data.teamName)) &&
                  norm(h.arena) === norm(data.arenaName)
                )
                .sort((a: any, b: any) => {
                  const aIn = isDateInRange(gameDateObj, a.startDate, a.endDate, a.seasonStart, a.seasonEnd) ? -1 : 1;
                  const bIn = isDateInRange(gameDateObj, b.startDate, b.endDate, b.seasonStart, b.seasonEnd) ? -1 : 1;

                  if (aIn !== bIn) return aIn - bIn; // prefer ones that contain the date

                  // tiebreaker: closer start date
                  return Math.abs(gameDateObj.getTime() - new Date(a.startDate).getTime()) -
                         Math.abs(gameDateObj.getTime() - new Date(b.startDate).getTime());
                });

              historicalMatch = candidates[0] || null;
            }

            if (historicalMatch) {
              lat = historicalMatch.latitude;
              lng = historicalMatch.longitude;
              displayName = historicalMatch.arena || data.arenaName;
              const currentTeam = arenasData.find(
                (a: any) =>
                  a.teamName === historicalMatch.teamName
              );

              colorCode = historicalMatch.colorCode || 'red';
              teamCode = historicalMatch.teamCode || '';

            } else if (data.latitude != null && data.longitude != null) {
              // Final fallback to check-in coords
              lat = data.latitude;
              lng = data.longitude;
            }
          }

          if (lat != null && lng != null) {
            markers.push({
              id: doc.id,
              title: displayName,
              latitude: lat,
              longitude: lng,
              colorCode,
              colorCode2: match?.colorCode2,
              teamCode,
              league: data.league,
            });
          }
        });

        setAllCheckIns(all);
        setPins(markers);

        const leaguesSet = new Set(markers.map(m => String(m.league || '').toUpperCase()).filter(Boolean));
        setLeagueOptions(['All', ...Array.from(leaguesSet)]);

        // Build travel coordinates - oldest to newest
        const sortedCheckIns = [...all].sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime());

        const coords = sortedCheckIns
          .map(ci => {
            const currentName = getCurrentArenaName(ci.arenaName);
            let lat = ci.latitude;
            let lng = ci.longitude;

            const match = (arenasData as any[]).find(
              (a: any) => a.league === ci.league && a.arena === ci.arenaName
            ) || (arenasData as any[]).find(
              (a: any) => a.league === ci.league && a.arena === currentName
            );

            if (match) {
              lat = match.latitude;
              lng = match.longitude;
            } else {
              // Historical teams fallback
              let historicalMatch: any = null;

            // First priority: exact arena name match
            historicalMatch = historicalTeamsData.find((h: any) =>
              h.teamName === ci.teamName && h.arena === ci.arenaName
            );

            if (!historicalMatch && ci.teamName && ci.gameDate) {
              const gameDateObj = new Date(ci.gameDate);

              const candidates = historicalTeamsData
                .filter((h: any) =>
                  h.teamName === ci.teamName &&
                  norm(h.arena) === norm(ci.arenaName)
                )
                .sort((a: any, b: any) => {
                  const aIn = isDateInRange(gameDateObj, a.startDate, a.endDate, a.seasonStart, a.seasonEnd) ? -1 : 1;
                  const bIn = isDateInRange(gameDateObj, b.startDate, b.endDate, b.seasonStart, b.seasonEnd) ? -1 : 1;


                  if (aIn !== bIn) return aIn - bIn;

                  return Math.abs(gameDateObj.getTime() - new Date(a.startDate).getTime()) -
                         Math.abs(gameDateObj.getTime() - new Date(b.startDate).getTime());
                });

              historicalMatch = candidates[0] || null;
            }
              if (historicalMatch) {
                lat = historicalMatch.latitude;
                lng = historicalMatch.longitude;
              }
            }

            if (lat != null && lng != null) {
              return { latitude: lat, longitude: lng };
            }
            return null;
          })
          .filter(Boolean) as { latitude: number; longitude: number }[];

        setTravelCoords(coords);

      } catch (error: any) {
        if (error?.code === 'permission-denied') {
          setAlertMessage('Please allow location access in Settings to use the map.');
        } else if (error?.message?.includes('network') || error?.code === 'unavailable') {
          setAlertMessage('No internet connection. Check your connection and try again.');
        } else if (error?.code === 'unauthenticated') {
          setAlertMessage('Session expired. Please log in again.');
        } else {
          setAlertMessage('Something went wrong loading your check-ins.');
        }
        setAlertVisible(true);
      } finally {
        setLoading(false);
      }
    };

    loadEverything();
  }, [arenasData, arenaHistoryData, historicalTeamsData]);

  const styles = StyleSheet.create({
    alertOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center',padding:20},
    alertContainer:{backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF',borderRadius:16,padding:24,width:'100%',maxWidth:340,alignItems:'center',borderWidth:3,borderColor:colorScheme==='dark'?'#4A6FA5':'#2F4F68',shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.3,shadowRadius:16,elevation:16},
    alertTitle:{fontSize:18,fontWeight:'700',color:colorScheme==='dark'?'#FFFFFF':'#0A2940',textAlign:'center',marginBottom:12},
    alertMessage:{fontSize:15,color:colorScheme==='dark'?'#AFC7E6':'#374151',textAlign:'center',marginBottom:24,lineHeight:22},
    alertButton:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#E0E7FF',borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222',paddingVertical:12,paddingHorizontal:32,borderRadius:30},
    alertButtonText:{color:colorScheme==='dark'?'#FFFFFF':'#0A2940',fontWeight:'700',fontSize:16},
    arenaHeading:{fontSize:16,fontWeight:'600',color:colorScheme==='dark'?'#FFFFFF':'#1D3557',textAlign:'center',marginBottom:10},
    checkInRow:{paddingHorizontal:12,paddingVertical:8,borderBottomWidth:1,borderBottomColor:colorScheme==='dark'?'#4A6FA5':'#ccc'},
    checkInDate:{fontSize:16,fontWeight:'600',color:colorScheme==='dark'?'#FFFFFF':'#1D3557'},
    checkInMatchup:{fontSize:14,color:colorScheme==='dark'?'#AFC7E6':'#555'},
    calloutContainer:{paddingVertical:8,paddingHorizontal:12,borderRadius:10,borderWidth:3,borderColor:colorScheme==='dark'?'#B22222':'#B22222'},
    calloutText:{fontSize:14,fontWeight:'600',textAlign:'center'},
    closeButton:{marginTop:10,paddingVertical:12,paddingHorizontal:32,backgroundColor:colorScheme==='dark'?'#1B3F68':'#E0E7FF',borderRadius:30,borderWidth:2,borderColor:colorScheme==='dark'?'#4A6FA5':'#2F4F68',alignSelf:'center',alignItems:'center'},
    closeButtonText:{color:colorScheme==='dark'?'#FFFFFF':'#0A2940',fontSize:12,fontWeight:'600'},
    dropdownContainer:{position:'absolute',top:55,alignSelf:'center',width:'75%',zIndex:10},
    dropdownHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:14,paddingHorizontal:18,backgroundColor:colorScheme==='dark'?'#243B5A':'#F5F1E6',borderWidth:3,borderRadius:16,borderColor:colorScheme==='dark'?'#B55555':'#B22222'},
    dropdownHeaderText:{color:colorScheme==='dark'?'#FFFFFF':'#1D3557',fontSize:17,fontWeight:'600',textAlign:'center',flex:1},
    dropdownList:{backgroundColor:colorScheme==='dark'?'#243B5A':'#F5F1E6',borderLeftWidth:3,borderRightWidth:3,borderBottomWidth:3,borderBottomLeftRadius:16,borderBottomRightRadius:16,borderColor:colorScheme==='dark'?'#B55555':'#B22222'},
    dropdownItem:{paddingVertical:12,paddingHorizontal:18},
    dropdownItemText:{color:colorScheme==='dark'?'#FFFFFF':'#1D3557',fontSize:15,fontWeight:'500',textAlign:'center'},
    emptyContainer:{flex:1,justifyContent:'center',alignItems:'center'},
    emptyText:{fontSize:18,fontWeight:'600',color:colorScheme==='dark'?'#FFFFFF':'#1D3557',textAlign:'center'},
    findLocationButton:{position:'absolute',bottom:30,right:20,backgroundColor:colorScheme==='dark'?'#243B5A':'#F5F1E6',padding:8,borderRadius:24,borderWidth:3,borderColor:colorScheme==='dark'?'#B55555':'#B22222',zIndex:10,elevation:8},
    groupTitle:{fontSize:18,fontWeight:'bold',color:colorScheme==='dark'?'#FFFFFF':'#1D3557',marginBottom:8,textAlign:'center',width:'100%'},
    loadingOverlay:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:colorScheme==='dark'?'#0D131F':'#FFFFFF'},
    loggedOutContainer:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:colorScheme==='dark'?'#0D131F':'#FFFFFF'},
    loggedOutText:{fontSize:18,fontWeight:'600',color:colorScheme==='dark'?'#FFFFFF':'#1D3557',textAlign:'center'},
    map:{flex:1},
    markerContainer:{alignItems:'center'},
    modalArenaButton:{paddingVertical:6,paddingHorizontal:14,borderRadius:10,borderWidth:2,borderColor:'#B22222',alignSelf:'center',marginBottom:8,marginTop:-2},
    modalArenaButtonText:{color:colorScheme==='dark'?'#FFFFFF':'#0A2940',fontWeight:'600',fontSize:12},
    modalViewText:{fontSize:11,color:colorScheme==='dark'?'#AFC7E6':'#666',textAlign:'center',marginBottom:10},
    modalContent:{width:'90%',maxHeight:'80%',flexDirection:'column',backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF',borderRadius:12,padding:20,shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:12},
    modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center'},
    pickerSelectedText:{color:colorScheme==='dark'?'#FFFFFF':'#1D3557',fontSize:17,fontWeight:'600'},
    pickerArrow:{position:'absolute',right:16},
    pinContainer:{width:40,height:40,justifyContent:'center',alignItems:'center',position:'relative'},
    pinCircle:{width:40,height:40,justifyContent:'center',alignItems:'center',borderWidth:3,borderRadius:50},
    pinImage:{width:40,height:40},
    shareButton:{position:'absolute',bottom:30,left:20,backgroundColor:colorScheme==='dark'?'#243B5A':'#F5F1E6',padding:8,borderRadius:24,borderWidth:3,borderColor:colorScheme==='dark'?'#B55555':'#B22222',zIndex:10,elevation:8,shadowColor:'#000',shadowOpacity:0.3,shadowRadius:6,shadowOffset:{width:0,height:4}},
    teamCodeText:{position:'absolute',top:4,left:11,color:'white',fontWeight:'bold',fontSize:7},
    travelLinesButton:{position:'absolute',bottom:30,alignSelf:'center',backgroundColor:colorScheme==='dark'?'#243B5A':'#E0E7FF',paddingHorizontal:20,paddingVertical:12,borderRadius:30,zIndex:10,elevation:8,shadowColor:'#000',shadowOpacity:0.3,shadowRadius:6,shadowOffset:{width:0,height:4},borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#2F4F68'},
    travelLinesButtonText:{color:colorScheme==='dark'?'#FFFFFF':'#0A2940',fontWeight:'bold',fontSize:16},
    viewShotContainer:{flex:1},
    visitBadge: { backgroundColor: '#D32F2F', width: 14, height: 14, borderRadius: 30, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 18, right: 24, zIndex: 2, borderWidth: 1, borderColor: 'white', },
    visitBadgeText: { color: 'white', fontWeight: '900', fontSize: 4, includeFontPadding: false, },
    upgradeContainer:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:colorScheme==='dark'?'#0D131F':'#FFFFFF'},
    upgradeButton:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#E0E7FF',paddingVertical:16,paddingHorizontal:32,borderRadius:30},
    upgradeButtonText:{color:colorScheme==='dark'?'#FFFFFF':'#0A2940',fontSize:18,fontWeight:'bold'},
    upgradeTitle:{fontSize:24,fontWeight:'bold',color:colorScheme==='dark'?'#FFFFFF':'#1D3557',textAlign:'center',marginBottom:20},
    upgradeSubtext:{fontSize:18,color:colorScheme==='dark'?'#AFC7E6':'#374151',textAlign:'center',marginBottom:30,paddingHorizontal:20}
  });

  if (!user) return null;

  if (loading || arenasData.length === 0) {
    return (
      <View style={styles.loadingOverlay}>
        <LoadingPuck />
      </View>
    );
  }

  if (pins.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No ballparks visited yet
        </Text>
      </View>
    );
  }

  const openCheckInModal = (checkIns: any[]) => {
    setSelectedArenaCheckIns(checkIns.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()));
    setModalVisible(true);
  };

  const centerOnCurrentLocation = async () => {
    if (!user) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAlertMessage('Location permission is needed to center the map.');
        setAlertVisible(true);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    } catch (e) {
      setAlertMessage('Could not get current location.');
      setAlertVisible(true);
    }
  };

  return (
      <>
        <Modal visible={alertVisible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertContainer}>
              <Text style={styles.alertTitle}>Notice</Text>
              <Text style={styles.alertMessage}>{alertMessage}</Text>
              <TouchableOpacity style={styles.alertButton} onPress={() => setAlertVisible(false)}>
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ViewShot ref={viewShotRef} style={styles.viewShotContainer} options={{ format: 'png', quality: 1 }}>
        <Modal visible={modalVisible} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <FlatList
                data={selectedArenaCheckIns}
                keyExtractor={(ci) => ci.id}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item: ci, index }) => (
                    <TouchableOpacity
                      style={styles.checkInRow}
                      onPress={() => {
                        setModalVisible(false);
                        if (hasFullAccess || isInTrial) {
                          router.push(`/checkin/${ci.id}?userId=${auth.currentUser?.uid}`);
                        } else {
                          setAlertMessage('Upgrade to Premium to open full check-in details.');
                          setAlertVisible(true);
                        }
                      }}
                    >
                      {(index === 0 || selectedArenaCheckIns[index - 1]?.arenaName !== ci.arenaName) && (
                        <>
                          <Text style={styles.arenaHeading}>
                            {ci.arenaName}
                          </Text>

                          <TouchableOpacity
                            style={styles.modalArenaButton}
                            onPress={() => {
                              if (hasFullAccess || isInTrial) {
                                const matchingPin = pins.find(
                                  p => p.title === ci.arenaName
                                );

                                if (matchingPin) {
                                  const arenaId = `${matchingPin.latitude.toFixed(6)}_${matchingPin.longitude.toFixed(6)}`;
                                  router.push(`/arenas/${arenaId}`);
                                }
                              } else {
                                setAlertMessage('Upgrade to Premium to open ballpark pages.');
                                setAlertVisible(true);
                              }
                            }}
                          >
                            <Text style={styles.modalArenaButtonText}>
                              Go to Ballpark Page
                            </Text>
                          </TouchableOpacity>

                          <Text style={styles.modalViewText}>
                            Click on check-in to view
                          </Text>
                        </>
                      )}
                      <Text style={styles.checkInDate}>
                        {new Date(ci.gameDate).toLocaleDateString()}
                      </Text>
                      <Text style={styles.checkInMatchup}>
                        {ci.teamName} vs {ci.opponent}
                      </Text>
                    </TouchableOpacity>
                  )}
                />

              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => {
              if (hasFullAccess || isInTrial) {
                setDropdownVisible(prev => !prev);
              } else {
                setAlertMessage('Upgrade to Premium to unlock Favorites and advanced map filters.');
                setAlertVisible(true);
              }
            }}
          >
            <Text style={styles.dropdownHeaderText}>
              {selectedLeague === 'Favorites' ? 'Favorites' : selectedLeague}
            </Text>
            <Ionicons name={dropdownVisible ? 'chevron-up' : 'chevron-down'} size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#0A2940'} />
          </TouchableOpacity>

          {dropdownVisible && (
            <View style={styles.dropdownList}>
              {['All', 'Favorites', ...leagueOptions.filter(opt => opt !== 'All')].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={styles.dropdownItem}
                  onPress={() => {
                    if (opt === 'Favorites' && !(hasFullAccess || isInTrial)) {
                      setAlertMessage('Upgrade to Premium to unlock Favorites.');
                      setAlertVisible(true);
                      setDropdownVisible(false);
                      return;
                    }

                    setSelectedLeague(opt);
                    setDropdownVisible(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.travelLinesButton}
          onPress={() => {
            if (hasFullAccess || isInTrial) {
              setShowTravelLines(prev => !prev);
            } else {
              setAlertMessage('Upgrade to Premium to unlock travel lines.');
              setAlertVisible(true);
            }
          }}
        >
          <Text style={styles.travelLinesButtonText}>
            {showTravelLines ? 'Hide' : 'Show'} Travel Lines
          </Text>
        </TouchableOpacity>

          <MapView
            ref={mapRef}
            style={styles.map}
            mapType="standard"
            showsUserLocation={true}
            followsUserLocation={false}
            showsMyLocationButton={false}
            initialRegion={{
              latitude: 39.8283,
              longitude: -98.5795,
              latitudeDelta: 55,
              longitudeDelta: 55,
            }}
          >
            <UrlTile
              urlTemplate="https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png"
              maximumZ={20}
              flipY={false}
              tileSize={256}
              zIndex={-1}
            />

            {showTravel && (
              <Polyline
                coordinates={travelCoords.slice(
                  0,
                  Math.max(2, Math.floor(travelAnimValue * travelCoords.length))
                )}
                strokeColor="#2F4F68"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
                geodesic={true}
                lineDashPattern={[4, 12]}
                zIndex={1}
              />
            )}

            {visiblePins.map(pin => {
              const visitCount = visitCountMap.get(norm(pin.title || '')) || 0;
              const checkInsAtArena = checkInsByArena.get(norm(pin.title || '')) || [];

              return (
                <Marker
                  key={pin.id}
                  coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  onPress={() => openCheckInModal(checkInsAtArena)}
                >
                  <View style={styles.markerContainer}>
                    {visitCount > 1 && (
                      <View style={styles.visitBadge}>
                        <Text style={styles.visitBadgeText}>{visitCount}x</Text>
                      </View>
                    )}

                    <View style={[styles.pinCircle,{backgroundColor:pin.colorCode,borderColor:pin.colorCode2}]}>
                      <Image
                        source={require('../../assets/images/pin_template.png')}
                        style={[styles.pinImage,{tintColor:pin.colorCode2}]}
                        resizeMode="contain"
                      />
                      <Text style={styles.teamCodeText}>
                        {pin.teamCode || ''}
                      </Text>
                    </View>
                  </View>
                </Marker>
              );
            })}
          </MapView>

        <TouchableOpacity style={styles.findLocationButton} onPress={centerOnCurrentLocation}>
          <Ionicons name="locate-outline" size={28} color={colorScheme === 'dark' ? '#FFFFFF' : '#0A2940'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            if (hasFullAccess || isInTrial) {
              handleShare();
            } else {
              setAlertMessage('Upgrade to Premium to unlock map sharing.');
              setAlertVisible(true);
            }
          }}
        >
          <Ionicons name="share-social-outline" size={28} color={colorScheme === 'dark' ? '#FFFFFF' : '#0A2940'} />
        </TouchableOpacity>
      </ViewShot>
    </>
  );
}