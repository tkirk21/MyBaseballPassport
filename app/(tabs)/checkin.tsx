// app/(tabs)/checkin.tsx
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Dimensions, Image, Modal, ImageBackground, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useColorScheme } from '../../hooks/useColorScheme';
import { usePremium } from '@/context/PremiumContext';

import LoadingPuck from '@/components/loadingPuck';
import { loadArenas } from '@/utils/loadArenas';
import { loadSchedule } from '@/utils/loadSchedule';

const auth = getAuth();

export default function CheckInScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  const { hasFullAccess, isInTrial, checkInCount } = usePremium();
  const hasAppAccess = hasFullAccess || isInTrial;
  const hasFreeCheckInsRemaining = hasAppAccess || checkInCount < 3;
  const colorScheme = useColorScheme();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [upgradeAlertVisible, setUpgradeAlertVisible] = useState(false);
  const [upgradeAlertTitle, setUpgradeAlertTitle] = useState('');
  const [upgradeAlertMessage, setUpgradeAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [arenaData, setArenaData] = useState<any[]>([]);
  const [combinedSchedule, setCombinedSchedule] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await loadArenas();
      setArenaData(data);

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
    };

    fetchData();
  }, []);

  if (arenaData.length === 0) {
    return <LoadingPuck />;
  }

  const showUpgradePrompt = (title: string, message: string) => {
    setUpgradeAlertTitle(title);
    setUpgradeAlertMessage(message);
    setUpgradeAlertVisible(true);
  };

  const handleLiveCheckIn = async () => {
    setCheckingIn(true);  // ← SHOW LOADING PUCK

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCheckingIn(false);
        setAlertTitle('Permission Denied');
        setAlertMessage('Location permission is needed to check in to a live game.');
        setAlertVisible(true);
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 5000,
      });

      const now = new Date();
      const allGamesToday = combinedSchedule.filter(g => {
        const gameStart = new Date(g.date);
        const oneHourBefore = new Date(gameStart.getTime() - 60 * 60 * 1000);
        const fourHoursAfter = new Date(gameStart.getTime() + 4 * 60 * 60 * 1000);

        return now >= oneHourBefore && now <= fourHoursAfter;
      });

      if (allGamesToday.length === 0) {
        setCheckingIn(false);
        setAlertTitle('Can Not Check In');
        setAlertMessage('You are not close enough to any ballpark or you are checking in too early.');
        setAlertVisible(true);
        return;
      }

      let closestGame = null;
      let closestDistanceMiles = Infinity;

      for (const game of allGamesToday) {
        const arena = arenaData.find(a =>
          (a.arena === game.arena || a.arena === game.location) &&
          a.league === game.league
        );

        if (!arena) continue;

        const distanceMiles = getDistanceMiles(
          coords.latitude,
          coords.longitude,
          arena.latitude,
          arena.longitude
        );

        if (distanceMiles < closestDistanceMiles) {
          closestDistanceMiles = distanceMiles;
          closestGame = { ...game, arena };
        }
      }

      if (!closestGame || closestDistanceMiles > .28) {
        setCheckingIn(false);
        setAlertTitle('Not Close Enough');
        setAlertMessage('You must be closer to the ballpark to check-in.');
        setAlertVisible(true);
        return;
      }

      setCheckingIn(false);
      router.push({
        pathname: '/checkin/live',
        params: {
          league: closestGame.league,
          arenaName: closestGame.arena.arena,
          homeTeam: closestGame.homeTeam || closestGame.team || '',
          opponent: closestGame.opponent || closestGame.awayTeam || '',
          gameDate: closestGame.date,
        },
      });

    } catch (error: any) {
      setCheckingIn(false);

      if (error?.code === 'permission-denied') {
        setAlertTitle('Permission Denied');
        setAlertMessage('Location permission denied.');
      } else if (error?.code === 'unauthenticated') {
        setAlertTitle('Session Expired');
        setAlertMessage('Session expired. Please log in again.');
      } else if (error?.message?.toLowerCase().includes('network')) {
        setAlertTitle('Network Error');
        setAlertMessage('Network error. Check your connection.');
      } else {
        setAlertTitle('Check-In Unavailable');
        setAlertMessage('No live game found near your location.')
      }

      setAlertVisible(true);
    }
  };

  // Distance in miles
  const getDistanceMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3958.8; // Earth's radius in miles
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number) => deg * (Math.PI / 180);

  const styles = StyleSheet.create({
    alertOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center',padding:20},
    alertContainer:{backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF',borderRadius:16,padding:24,width:'100%',maxWidth:340,alignItems:'center',borderWidth:3,borderColor:colorScheme==='dark'?'#B22222':'#B22222',shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.3,shadowRadius:16,elevation:16},
    alertTitle:{fontSize:18,fontWeight:'700',color:colorScheme==='dark'?'#FFFFFF':'#0A2940',textAlign:'center',marginBottom:12},
    alertMessage:{fontSize:15,color:colorScheme==='dark'?'#AFC7E6':'#374151',textAlign:'center',marginBottom:24,lineHeight:22},
    alertButton:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#E0E7FF',borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222',paddingVertical:12,paddingHorizontal:32,borderRadius:30},
    alertButtonText:{color:colorScheme==='dark'?'#FFFFFF':'#0A2940',fontWeight:'700',fontSize:16},
    buttons:{position:"absolute",bottom:140,left:60,right:60,gap:40},
    buttonPrimary:{backgroundColor:colorScheme==='dark'?'#243B5A':'#F5F1E6',borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222',paddingVertical:16,borderRadius:30},
    buttonSecondary:{backgroundColor:colorScheme==='dark'?'#243B5A':'#F5F1E6',paddingVertical:16,borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222',borderRadius:30},
    buttonText:{fontSize:16,color:colorScheme==='dark'?'#FFFFFF':'#0A2940',fontWeight:"600",textAlign:"center"},
    container:{flex:1,backgroundColor:colorScheme==='dark'?'#0D131F':'#F5F1E6'},
    heroImage:{position:"absolute",top:160,width:Dimensions.get("window").width*0.6,height:160,alignSelf:"center"},
    header:{position:"absolute",top:50,left:0,right:0,fontSize:34,fontWeight:"bold",color:colorScheme==='dark'?'#F5F1E6':'#1D3557',textAlign:"center",textShadowColor:colorScheme==='dark'?'#000000':'#ffffff',textShadowOffset:{width:1,height:1},textShadowRadius:2},
    loadingOverlay:{position:"absolute",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0,0,0,0.4)",zIndex:999,alignItems:"center",justifyContent:"center"},
    overlay:{...StyleSheet.absoluteFillObject,backgroundColor:"rgba(30,30,30,0.1)"},
    subHeader:{position:"absolute",top:100,left:0,right:0,fontSize:16,color:colorScheme==='dark'?'#AFC7E6':'#0A2940',textAlign:"center"}
  });

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={colorScheme === 'dark' ? require('../../assets/images/background_dark.jpg') : require('../../assets/images/background.jpg')}
        style={styles.container}
        resizeMode="cover"
      >
        {checkingIn && (
          <View style={styles.loadingOverlay}>
            <LoadingPuck />
          </View>
        )}

        <View style={styles.overlay} />

        <Text style={styles.header}>Check In</Text>
        <Text style={styles.subHeader}>Log your game experience</Text>
        <Image source={require('@/assets/images/checkin_icon.png')} style={styles.heroImage} resizeMode="contain" />

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[
              styles.buttonPrimary,
              { opacity: combinedSchedule.length === 0 ? 0.5 : 1 }
            ]}
            onPress={handleLiveCheckIn}
            disabled={combinedSchedule.length === 0}
          >
            <Text style={styles.buttonText}>
              {combinedSchedule.length === 0 ? 'Loading Schedule...' : 'Live Game'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={async () => {
              if (hasAppAccess) {
                router.push('/checkin/manual');
                return;
              }

              const today = new Date().toLocaleDateString('en-CA');
              const profileRef = doc(db, 'profiles', user.uid);
              const profileSnap = await getDoc(profileRef);
              const todayCount = profileSnap.data()?.[`dailyCheckInCounts.${today}`] ?? 0;

              if (todayCount >= 3) {
                showUpgradePrompt(
                  "Daily Limit Reached",
                  "You have reached today’s free check-in limit. Upgrade to Premium for unlimited access or come back tomorrow."
                );
                return;
              }

              router.push('/checkin/manual');
            }}
          >
            <Text style={styles.buttonText}>Past Game</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* CUSTOM THEMED ALERT MODAL — now inside the root View */}
      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{alertTitle}</Text>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity onPress={() => setAlertVisible(false)} style={styles.alertButton}>
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={upgradeAlertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{upgradeAlertTitle}</Text>
            <Text style={styles.alertMessage}>{upgradeAlertMessage}</Text>
            <TouchableOpacity onPress={() => setUpgradeAlertVisible(false)} style={styles.alertButton}>
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}