import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,  } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useColorScheme } from '../../hooks/useColorScheme';

const auth = getAuth();
const LEAGUES_DATA = [
  "MAJOR LEAGUE BASEBALL", "INTERNATIONAL LEAGUE", "PACFIC COAST LEAGUE",
];

export default function FavoriteLeaguesScreen() {
  const user = auth.currentUser;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[]>([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const filteredLeagues = LEAGUES_DATA;

  if (!user) {
    return null;
  }

  useEffect(() => {
    const loadFavoriteLeagues = async () => {
      if (!auth.currentUser) {
        setFavoriteLeagues([]);
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, 'profiles', auth.currentUser.uid));
        const saved = docSnap.data()?.favoriteLeagues;

        if (Array.isArray(saved) && saved.length > 0) {
          setFavoriteLeagues(saved.filter(l => typeof l === 'string' && l.trim() !== ''));
        } else {
          setFavoriteLeagues([]);
        }
      } catch (error: any) {
        let title = 'Error';
        let message = 'Failed to load favorite leagues.';

        if (error?.code === 'permission-denied') {
          title = 'Permission Denied';
          message = 'You do not have permission to access this data.';
        } else if (error?.code === 'unavailable') {
          title = 'Network Error';
          message = 'Network connection lost. Please try again.';
        }

        setAlertTitle(title);
        setAlertMessage(message);
        setAlertVisible(true);
      }
    };

    loadFavoriteLeagues();
  }, []);

  const toggleLeague = async (league: string) => {
    let updated: string[];
    if (favoriteLeagues.includes(league)) {
      updated = favoriteLeagues.filter(l => l !== league);
    } else {
      updated = [...favoriteLeagues, league];
    }
    setFavoriteLeagues(updated);
    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'profiles', auth.currentUser.uid),
          { favoriteLeagues: updated },
          { merge: true }
        );
      } catch (error: any) {
        let title = 'Error';
        let message = 'Failed to save favorite leagues.';

        if (error?.code === 'permission-denied') {
          title = 'Permission Denied';
          message = 'You do not have permission to update this data.';
        } else if (error?.code === 'unavailable') {
          title = 'Network Error';
          message = 'Network connection lost. Please try again.';
        }

        setAlertTitle(title);
        setAlertMessage(message);
        setAlertVisible(true);
      }
    }
  };

  const styles = StyleSheet.create({
    alertOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center',padding:20},
    alertContainer:{backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF',borderRadius:16,padding:24,width:'100%',maxWidth:340,alignItems:'center',borderWidth:3,borderColor:colorScheme==='dark'?'#B22222':'#2F4F68',shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.3,shadowRadius:16,elevation:16},
    alertTitle:{fontSize:18,fontWeight:'700',color:colorScheme==='dark'?'#FFFFFF':'#0A2940',textAlign:'center',marginBottom:12},
    alertMessage:{fontSize:15,color:colorScheme==='dark'?'#AFC7E6':'#374151',textAlign:'center',marginBottom:24,lineHeight:22},
    alertButton:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#F5F1E6',borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#2F4F68',paddingVertical:12,paddingHorizontal:32,borderRadius:30},
    alertButtonText:{color:colorScheme==='dark'?'#FFFFFF':'#0A2940',fontWeight:'700',fontSize:16},
    backArrow:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940'},
    bottomContainer:{paddingBottom:40,paddingHorizontal:20},
    centeredList:{flex:1,justifyContent:'center',paddingHorizontal:20},
    headerRow:{paddingTop:50,paddingHorizontal:20,flexDirection:'row',alignItems:'center'},
    headerTitle:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940',fontSize:28,fontWeight:'700',marginLeft:20},
    list:{paddingHorizontal:20},
    leagueRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:16,borderBottomWidth:1,borderBottomColor:colorScheme==='dark'?'#4A6FA5':'#2F4F68'},
    leagueText:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940'},
    saveButton:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#FFFFFF',paddingVertical:14,borderRadius:30,borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222',width:'70%',alignSelf:'center',alignItems:'center'},
    saveButtonText:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940',fontSize:18,fontWeight:'600'},
    screenBackground:{flex:1,backgroundColor:colorScheme==='dark'?'#0D131F':'#F5F1E6'}
  });

  return (
    <View style={styles.screenBackground}>
     <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{alertTitle}</Text>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={styles.backArrow.color} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorite Leagues</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={styles.list}>
            {filteredLeagues.map(league => (
              <TouchableOpacity
                key={league}
                style={styles.leagueRow}
                onPress={() => toggleLeague(league)}
              >
                <Text style={styles.leagueText}>{league}</Text>
                {favoriteLeagues.includes(league) && (
                  <Ionicons name="checkmark" size={24} color={colorScheme === 'dark' ? '#FFFFFF' : '#0A2940'} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
        <View style={styles.bottomContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={() => router.back()}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
    </View>
  );
}