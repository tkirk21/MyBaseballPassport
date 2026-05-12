//app/leagues/[leagueName].tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { leagueLogos } from '@/assets/images/leagueLogos';
import { loadLeagues } from '@/utils/loadLeagues';
import { loadArenas } from '@/utils/loadArenas';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import LoadingPuck from '@/components/loadingPuck';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LeagueDetails() {
  const [loading, setLoading] = React.useState(true);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const { leagueName } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  if (!leagueName || typeof leagueName !== 'string') return null;
  const [selectedArena, setSelectedArena] = useState(null);
  const [arenas, setArenas] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const league = leagues.find(
    (l: any) => (l.league || '').toUpperCase() === String(leagueName || '').toUpperCase()
  );
  const leagueCode = (league?.league || '').toUpperCase();
  const mapRef = useRef<MapView>(null);
  const leagueArenas = useMemo(() => {
    return (arenas as any[]).filter((a) => (a.league || '').toUpperCase() === leagueCode);
  }, [leagueCode, arenas]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [leagueName]);

  useEffect(() => {
    const fetchArenas = async () => {
      const data = await loadArenas();
      setArenas(data);

      const leaguesData = await loadLeagues();
      setLeagues(leaguesData);
    };

    fetchArenas();
  }, []);

  useEffect(() => {
    if (
      selectedArena &&
      typeof selectedArena.latitude === 'number' &&
      typeof selectedArena.longitude === 'number' &&
      mapRef.current
    ) {
      try {
        mapRef.current.animateToRegion(
          {
            latitude: selectedArena.latitude,
            longitude: selectedArena.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          500
        );
      } catch {
        setAlertMessage('Map failed to animate to selected arena.');
        setAlertVisible(true);
      }
    }
  }, [selectedArena]);

  const styles = StyleSheet.create({
    backButton:{position:'absolute',left:10,zIndex:10,padding:12},
    blueStrip:{position:'absolute',top:-30,left:0,right:0,height:120,zIndex:5},
    container:{padding:20,paddingBottom:80,alignItems:'center',backgroundColor:colorScheme==='dark'?'#0D131F':'#F5F1E6',flexGrow:1},
    fullContainer:{flex:1, backgroundColor:colorScheme==='dark'?'#0D131F':'#F5F1E6'},
    description:{fontSize:16,marginBottom:20,textAlign:'center',color:colorScheme==='dark'?'#AFC7E6':'#0A2940'},
    info:{fontSize:14,marginBottom:8,color:colorScheme==='dark'?'#AFC7E6':'#0A2940',textAlign:'center'},
    infoBox:{backgroundColor:colorScheme==='dark'?'rgba(19,47,79,0.85)':'rgba(255,255,255,0.9)',padding:16,borderRadius:12,borderWidth:4,borderColor:'#B22222',width:'100%',alignItems:'center'},
    link:{fontSize:16,color:colorScheme==='dark'?'#AFC7E6':'#0A2940',marginTop:12},
    loadingContainer:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:colorScheme==='dark'?'#0D131F':'#F5F1E6'},
    logoContainer:{top:10,left:-10,alignSelf:'center',width:136,height:136,zIndex:20},
    logoInnerCircle:{width:168,height:94,borderWidth:16,borderBottomWidth:0,borderColor:colorScheme==='dark'?'#0D131F':'#F5F1E6',borderTopLeftRadius:84,borderTopRightRadius:84,backgroundColor:'transparent',justifyContent:'center',alignItems:'center',marginTop:30},
    logoImage:{width:170,height:170,marginTop:-101},
    markerContainer:{width:40,height:40,justifyContent:'center',alignItems:'center',position:'relative'},
    markerImage:{width:40,height:40},
    markerText:{position:'absolute',top:4,left:11,color:'white',fontWeight:'bold',fontSize:7,textAlign:'center'},
    map:{width:310,height:300,borderColor:'#B22222'},
    mapWrapper:{borderWidth:4,borderColor:'#B22222',borderRadius:12,overflow:'hidden',marginBottom:16},
    pinCircle:{width:40,height:40,justifyContent:'center',alignItems:'center',borderWidth:3,borderRadius:50},
    safeArea:{flex:1,backgroundColor:colorScheme==='dark'?'#0D131F':'#F5F1E6'},
    scrollContainer:{padding:20,paddingTop:60,paddingBottom:170,alignItems:'center'},
    title:{fontSize:26,fontWeight:'bold',marginBottom:12,textAlign:'center',color:colorScheme==='dark'?'#FFFFFF':'#0A2940'}
  });

  if (!league) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Modal visible={alertVisible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertContainer}>
              <Text style={styles.alertTitle}>Error</Text>
              <Text style={styles.alertMessage}>
                League not found or invalid route parameter.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setAlertVisible(false);
                  router.back();
                }}
                style={styles.alertButton}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.container}>
          <Text style={styles.title}>League not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return loading ? (
    <View style={styles.loadingContainer}>
      <LoadingPuck size={320} />
    </View>
  ) : (
    <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? '#0A2940' : '#EDEEF0' }}>
      <View style={styles.fullContainer}>
        <View
          style={[
            styles.blueStrip,
            {
              backgroundColor: league.colorCode || '#0A2940',
              top: -insets.top - 10,
            },
          ]}
        />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={36} color="#E6E8EA" />
        </TouchableOpacity>
        {/* ← CIRCULAR LOGO WITH BORDER AROUND PUCK */}
        <View style={styles.logoContainer}>
          {/* Half circle border */}
          <View style={styles.logoInnerCircle} />

          {/* Logo image (separate, on top) */}
          <Image
            source={
              league.logoFileName && leagueLogos[league.logoFileName]
                ? leagueLogos[league.logoFileName]
                : leagueLogos['placeholder.png']
            }
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {leagueArenas.length > 0 ? (
            <>
              <View style={styles.mapWrapper}>
                <MapView
                  key="league-map"
                  ref={mapRef}
                  style={styles.map}
                  mapType="standard"
                  onMapReady={() => {
                    const validCoords = leagueArenas
                      .filter(a => typeof a.latitude === 'number' && typeof a.longitude === 'number')
                      .map(a => ({
                        latitude: a.latitude,
                        longitude: a.longitude,
                      }));

                    if (validCoords.length > 0) {
                      mapRef.current?.fitToCoordinates(validCoords, {
                        edgePadding: {
                          top: 50,
                          right: 50,
                          bottom: 50,
                          left: 50,
                        },
                        animated: true,
                      });
                    }
                  }}
                  initialRegion={{
                    latitude: leagueArenas[0]?.latitude || 39.5,
                    longitude: leagueArenas[0]?.longitude || -98.35,
                    latitudeDelta: 10,
                    longitudeDelta: 10,
                  }}
                >
                  <UrlTile
                    urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"  // {s} = a/b/c for load balancing
                    maximumZ={19}
                    flipY={false}
                    tileSize={256}
                    zIndex={-1}
                  />
                  {leagueArenas
                    .filter(a => typeof a.latitude === 'number' && typeof a.longitude === 'number')
                    .map((a, idx) => (
                      <Marker
                        key={`${a.league}-${a.arena}-${idx}`}
                        coordinate={{ latitude: a.latitude, longitude: a.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        title={a.arena}
                        description={a.city || ''}
                        onPress={() => setSelectedArena(a)}
                        calloutEnabled={true}
                        onCalloutPress={() => {
                          try {
                            const arenaId = `${a.latitude.toFixed(6)}_${a.longitude.toFixed(6)}`;
                            router.push(`/arenas/${arenaId}`);
                          } catch {
                            setAlertMessage('Unable to open arena.');
                            setAlertVisible(true);
                          }
                        }}
                      >
                        <View style={[styles.pinCircle,{backgroundColor:a.colorCode,borderColor:a.colorCode2 || a.colorCode}]}>
                          <Image
                            source={require('../../assets/images/pin_template.png')}
                            style={[styles.markerImage,{tintColor:a.colorCode2 || a.colorCode}]}
                            resizeMode="contain"
                          />
                          <Text style={styles.markerText}>
                            {a.teamCode || ''}
                          </Text>
                        </View>
                      </Marker>
                  ))}
                </MapView>
              </View>
            </>
          ) : (
            <Text style={styles.info}>No ballparks found for this league.</Text>
          )}
          <View style={styles.infoBox}>
            <Text style={styles.title}>{league.leagueName}</Text>
            <Text style={styles.description}>{league.description}</Text>
            <Text style={styles.info}>Teams: {league.numberOfTeams}</Text>
            {league.conferenceNames && (
              <Text style={styles.info}>Conferences: {league.conferenceNames}</Text>
            )}
            {league.divisionNames && (
              <Text style={styles.info}>Divisions: {league.divisionNames}</Text>
            )}
            <Text style={styles.info}>Founded: {league.foundedYear}</Text>
            <Text style={styles.info}>Country: {league.country}</Text>
            <Text style={styles.info}>Most Titles: {league.mostTitles}</Text>
            <Text style={styles.info}>Most Recent Champion: {league.mostRecentTitles}</Text>

            {league.website && (
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const rawUrl = league.website;
                    const formattedUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
                    const supported = await Linking.canOpenURL(formattedUrl);

                    if (!supported) {
                      setAlertMessage('Invalid or unsupported website link.');
                      setAlertVisible(true);
                      return;
                    }

                    await Linking.openURL(formattedUrl);
                  } catch {
                    setAlertMessage('Failed to open website.');
                    setAlertVisible(true);
                  }
                }}
              >
                <Text style={styles.link}>Visit Website</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}