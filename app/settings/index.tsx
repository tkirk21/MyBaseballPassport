//app/settings/index.tsx
import { Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useTheme } from '@/context/ThemeContext';
import { type ThemePreference } from '@/utils/themePersistence';
import { getFunctions, httpsCallable } from "firebase/functions";

const auth = getAuth();

export default function SettingsScreen() {
  const currentUser = auth.currentUser;
  const providerId = currentUser?.providerData[0]?.providerId;
  const isPasswordUser = providerId === 'password';
  if (!currentUser) {
    return null;
  }
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { themePreference, setThemePreference } = useTheme();
  const insets = useSafeAreaInsets();
  const [distanceUnit, setDistanceUnit] = useState<'miles' | 'km'>('miles');
  const [favoriteLeagues, setFavoriteLeagues] = useState<string[]>([]);
  const [startupTab, setStartupTab] = useState<'home' | 'profile' | 'checkin' | 'map' | 'friends'>('home');
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const SOCIAL_LINKS = {
    website: 'https://mysportspassport.app',
    facebook: 'https://www.facebook.com/profile.php?id=61587432124971',
    instagram: 'https://www.instagram.com/my_sports_passport?igsh=MTJla3R4Z3V0anhyNw==',
    x: 'https://x.com/mysportpassport',
  };

  useEffect(() => {
    const loadDistanceUnit = async () => {
      try {
        if (!currentUser?.uid) return;
        const docSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
        if (docSnap.exists()) {
          const unit = docSnap.data()?.distanceUnit;
          setDistanceUnit(unit === 'km' ? 'km' : 'miles');
        } else {
          setDistanceUnit('miles');
        }
      } catch (error: any) {
        let title = 'Error';
        let message = 'Failed to load distance unit.';

        if (error?.code === 'permission-denied') {
          title = 'Permission Error';
          message = 'You do not have access to this data.';
        } else if (error?.code === 'unavailable') {
          title = 'Network Error';
          message = 'Network connection lost. Please try again.';
        }

        setAlertTitle(title);
        setAlertMessage(message);
        setAlertVisible(true);
      }
    };

    loadDistanceUnit();
  }, []);

  useEffect(() => {
    const loadStartupTab = async () => {
      try {
        if (!currentUser?.uid) return;
        const docSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
        if (docSnap.exists()) {
          const saved = docSnap.data()?.startupTab;
          if (saved === 'home' || saved === 'profile' || saved === 'checkin' || saved === 'map' || saved === 'friends') {
            setStartupTab(saved);
          } else {
            setStartupTab('home');
          }
        } else {
          setStartupTab('home');
        }
      } catch (error: any) {
        let title = 'Error';
        let message = 'Failed to load startup tab.';

        if (error?.code === 'permission-denied') {
          title = 'Permission Error';
          message = 'You do not have access to this data.';
        } else if (error?.code === 'unavailable') {
          title = 'Network Error';
          message = 'Network connection lost. Please try again.';
        }

        setAlertTitle(title);
        setAlertMessage(message);
        setAlertVisible(true);
      }
    };

    loadStartupTab();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const loadFavoriteLeagues = async () => {
        if (!currentUser?.uid) return;

        try {
          const docSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
          if (docSnap.exists()) {
            const saved = docSnap.data()?.favoriteLeagues;
            setFavoriteLeagues(Array.isArray(saved) ? saved : []);
          } else {
            setFavoriteLeagues([]);
          }
        } catch (error: any) {
          let title = 'Error';
          let message = 'Failed to load favorite leagues.';

          if (error?.code === 'permission-denied') {
            title = 'Permission Error';
            message = 'You do not have access to this data.';
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
    }, [])
  );

  const updateThemePreference = (newPreference: ThemePreference) => {
    setThemePreference(newPreference);
  };

  const updateDistanceUnit = async (unit: 'miles' | 'km') => {
    try {
      if (!currentUser?.uid) return;
      setDistanceUnit(unit);
      await setDoc(
        doc(db, 'profiles', currentUser.uid),
        { distanceUnit: unit },
        { merge: true }
      );
    } catch (error: any) {
      let title = 'Error';
      let message = 'Failed to update distance unit.';

      if (error?.code === 'permission-denied') {
        title = 'Permission Error';
        message = 'You do not have permission to update this setting.';
      } else if (error?.code === 'unavailable') {
        title = 'Network Error';
        message = 'Network connection lost. Please try again.';
      }

      setAlertTitle(title);
      setAlertMessage(message);
      setAlertVisible(true);
    }
  };

  const updateStartupTab = async (tab: 'home' | 'profile' | 'checkin' | 'map' | 'friends') => {
    try {
      if (!auth.currentUser) return;
      setStartupTab(tab);
      await setDoc(
        doc(db, 'profiles', currentUser.uid),
        { startupTab: tab },
        { merge: true }
      );
    } catch (error: any) {
      let title = 'Error';
      let message = 'Failed to update startup tab.';

      if (error?.code === 'permission-denied') {
        title = 'Permission Error';
        message = 'You do not have permission to update this setting.';
      } else if (error?.code === 'unavailable') {
        title = 'Network Error';
        message = 'Network connection lost. Please try again.';
      }

      setAlertTitle(title);
      setAlertMessage(message);
      setAlertVisible(true);
    }
  };

  const logout = () => {
    setLogoutModalVisible(true);
  };

  const deleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const rateApp = () => {
    const url = Platform.OS === 'android'
      ? 'market://details?id=com.tkirk21.MyBaseballPassport'
      : 'itms-apps://apps.apple.com/app/id123456789?action=write-review';

    Linking.openURL(url).catch(() => {
      const fallback = Platform.OS === 'android'
        ? 'https://play.google.com/store/apps/details?id=com.tkirk21.MyBaseballPassport'
        : 'https://apps.apple.com/app/id123456789';

      Linking.openURL(fallback);
    });
  };

  const styles = StyleSheet.create({
    alertOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center',padding:20},
    alertContainer:{backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF',borderRadius:16,padding:24,width:'100%',maxWidth:340,alignItems:'center',borderWidth:3,borderColor:colorScheme==='dark'?'#B22222':'#B22222',shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.4,shadowRadius:16,elevation:16},
    alertTitle:{fontSize:18,fontWeight:'700',color:colorScheme==='dark'?'#FFFFFF':'#0A2940',textAlign:'center',marginBottom:12},
    alertMessageText:{fontSize:15,color:colorScheme==='dark'?'#AFC7E6':'#374151',textAlign:'center',marginBottom:24,lineHeight:22},
    alertButton:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#E0E7FF',paddingVertical:12,paddingHorizontal:32,borderRadius:30,borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222'},
    alertButtonText:{color:colorScheme==='dark'?'#FFFFFF':'#0A2940',fontWeight:'700',fontSize:16},
    backArrow:{color:colorScheme==='dark'?'#F5F1E6':'#0D2C42'},
    deletePasswordInput:{width:'100%',borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222',borderRadius:12,padding:12,marginTop:10,color:colorScheme==='dark'?'#FFFFFF':'#0A2940',backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF'},
    disabledRow:{opacity:0.5},
    distanceDropdown:{height:35,width:130,backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF',borderRadius:12,paddingHorizontal:12},
    distanceIcon:{width:30,height:30},
    distanceItemContainer:{backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF'},
    distanceItemText:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940',fontSize:18},
    distanceListContainer:{backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF',borderRadius:12,overflow:'hidden'},
    distanceSelectedText:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940',fontSize:18},
    dropdown:{height:35,width:130,backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF',borderRadius:12,paddingHorizontal:12,borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222'},
    dropdownSelectedText:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940',fontSize:18},
    dropdownPlaceholder:{opacity:0},
    dropdownIcon:{width:30,height:30},
    dropDownContainer:{backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF',borderRadius:12,overflow:'hidden'},
    dropdownItemContainer:{backgroundColor:colorScheme==='dark'?'#132F4F':'#FFFFFF'},
    dropdownItemText:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940',fontSize:18},
    dropdownRightIcon:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940'},
    headerRow:{paddingHorizontal:20,paddingBottom:15,flexDirection:'row',alignItems:'center'},
    headerTitle:{color:colorScheme==='dark'?'#F5F1E6':'#0D2C42',fontSize:28,fontWeight:'700',marginLeft:20},
    inner:{paddingHorizontal:20},
    label:{flex:1,color:colorScheme==='dark'?'#F5F1E6':'#0D2C42',fontSize:18,marginLeft:16},
    labelDisabled:{flex:1,fontSize:18,marginLeft:16,color:'#999'},
    link:{color:colorScheme==='dark'?'#F5F1E6':'#0D2C42',fontSize:17},
    logoutButton:{backgroundColor:colorScheme==='dark'?'#1B3F68':'#FFFFFF',padding:18,borderRadius:30,alignItems:'center',width:200,alignSelf:'center',marginBottom:30,borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222'},
    logoutText:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940',fontWeight:'700',fontSize:18},
    row:{flexDirection:'row',alignItems:'center',paddingVertical:8},
    rowIconDisabled:{color:'#999'},
    rowIcon:{color:colorScheme==='dark'?'#F5F1E6':'#0A2940'},
    rowArrow:{color:'#888888'},
    screenBackground:{flex:1,backgroundColor:colorScheme==='dark'?'#0D131F':'#F5F1E6'},
    section:{marginBottom:30},
    sectionTitle:{color:colorScheme==='dark'?'#F5F1E6':'#0D2C42',fontSize:20,fontWeight:'600',marginBottom:16,opacity:0.9},
    subLabel:{color:colorScheme==='dark'?'#BBBBBB':'#aaaaaa',fontSize:16,marginLeft:'auto'},
    version:{paddingBottom:20},
    versionText:{color:'#888',fontSize:16},
    themeButtonContainer:{flexDirection:'row',alignItems:'center',marginLeft:'auto'},
    themeButtonInactive:{paddingHorizontal:16,paddingVertical:10,backgroundColor:'transparent'},
    themeButtonActive:{paddingHorizontal:16,paddingVertical:10,borderRadius:30,backgroundColor:colorScheme==='dark'?'#1B3F68':'#FFFFFF',borderWidth:2,borderColor:colorScheme==='dark'?'#B22222':'#B22222'},
    themeButtonTextInactive:{fontSize:16,color:colorScheme==='dark'?'#D1D5DB':'#6B7280',fontWeight:'500'},
    themeButtonTextActive:{fontSize:16,color:colorScheme==='dark'?'#F5F1E6':'#0A2940',fontWeight:'600'}
  });

  return (
    <View style={styles.screenBackground}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom header */}
      <View style={[ styles.headerRow, { paddingTop: insets.top + 10 } ]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={styles.backArrow.color} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 50 }}
        >
        <View style={styles.inner}>
          {/* Account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            <TouchableOpacity style={styles.row} onPress={() => router.push('/settings/blocked')}>
              <Ionicons name="ban-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Blocked Users</Text>
              <Ionicons name="chevron-forward" size={24} color={styles.rowArrow.color} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={() => router.push('/settings/change-email')}>
              <Ionicons name="mail-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Change Email</Text>
              <Ionicons name="chevron-forward" size={24} color={styles.rowArrow.color} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={() => router.push('/settings/change-password')}>
              <Ionicons name="lock-closed-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Change Password</Text>
              <Ionicons name="chevron-forward" size={24} color={styles.rowArrow.color} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={deleteAccount}>
              <Ionicons name="trash-outline" size={26} color="#EF4444" />
              <Text style={[styles.label, { color: '#EF4444' }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          {/* Subscription */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>

            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push('/settings/subscribe')}
            >
              <Ionicons name="card-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Manage Subscription</Text>
              <Ionicons name="chevron-forward" size={24} color={styles.rowArrow.color} />
            </TouchableOpacity>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            <View style={styles.row}>
              <Ionicons name="home-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Default Startup Tab</Text>
              <Dropdown
                data={[
                  { label: 'Home', value: 'home' },
                  { label: 'Profile', value: 'profile' },
                  { label: 'Check-In', value: 'checkin' },
                  { label: 'Map', value: 'map' },
                  { label: 'Friends', value: 'friends' },
                ]}
                labelField="label"
                valueField="value"
                value={startupTab}
                onChange={(item) => updateStartupTab(item.value as 'home' | 'profile' | 'checkin' | 'map' | 'friends')}
                style={styles.dropdown}
                selectedTextStyle={styles.dropdownSelectedText}
                placeholderStyle={styles.dropdownPlaceholder}
                iconStyle={styles.dropdownIcon}
                containerStyle={styles.dropDownContainer}
                itemContainerStyle={styles.dropdownItemContainer}
                itemTextStyle={styles.dropdownItemText}
                activeColor="transparent"
                renderRightIcon={() => (
                  <Ionicons name="chevron-down" size={24} color={styles.dropdownRightIcon.color} />
                )}
              />
            </View>

            {/* Distance Unit */}
            <View style={styles.row}>
              <Ionicons name="speedometer-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Distance Unit</Text>
              <Dropdown
                data={[
                  { label: 'miles', value: 'miles' },
                  { label: 'kms', value: 'km' },
                ]}
                labelField="label"
                valueField="value"
                value={distanceUnit}
                onChange={(item) => updateDistanceUnit(item.value as 'miles' | 'km')}
                style={styles.dropdown}
                selectedTextStyle={styles.dropdownSelectedText}
                placeholderStyle={styles.dropdownPlaceholder}
                containerStyle={styles.dropDownContainer}
                itemTextStyle={styles.dropdownItemText}
                activeColor="transparent"
                renderRightIcon={() => (
                  <Ionicons name="chevron-down" size={24} color={styles.dropdownRightIcon.color} />
                )}
              />
            </View>

            <TouchableOpacity style={styles.row} onPress={() => router.push('/settings/favorite-leagues')}>
              <Ionicons name="star-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Favorite Leagues</Text>
              <Text style={styles.subLabel}>
                {favoriteLeagues.length === 0 ? 'All leagues' : `${favoriteLeagues.length} selected`}
              </Text>
              <Ionicons name="chevron-forward" size={24} color={styles.rowArrow.color} />
            </TouchableOpacity>

            <View style={styles.row}>
              <Ionicons name="moon-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>App Theme</Text>
              <View style={styles.themeButtonContainer}>
                <TouchableOpacity
                  style={themePreference === 'light' ? styles.themeButtonActive : styles.themeButtonInactive}
                  onPress={() => updateThemePreference('light')}
                >
                  <Text style={themePreference === 'light' ? styles.themeButtonTextActive : styles.themeButtonTextInactive}>
                    Light
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    themePreference === 'dark' ? styles.themeButtonActive : styles.themeButtonInactive,
                    { marginLeft: 12 }
                  ]}
                  onPress={() => updateThemePreference('dark')}
                >
                  <Text style={themePreference === 'dark' ? styles.themeButtonTextActive : styles.themeButtonTextInactive}>
                    Dark
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Socials */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Socials</Text>

            {/* Website */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => Linking.openURL(SOCIAL_LINKS.website).catch(() => {})}
            >
              <Ionicons name="globe-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Website</Text>
            </TouchableOpacity>

            {/* Facebook */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => Linking.openURL(SOCIAL_LINKS.facebook).catch(() => {})}
            >
              <Ionicons name="logo-facebook" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Facebook</Text>
            </TouchableOpacity>

            {/* Instagram – placeholder */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => Linking.openURL(SOCIAL_LINKS.instagram).catch(() => {})}
            >
              <Ionicons name="logo-instagram" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Instagram</Text>
            </TouchableOpacity>

            {/* X – placeholder */}
            <TouchableOpacity
              style={styles.row}
              onPress={() => Linking.openURL(SOCIAL_LINKS.x).catch(() => {})}
            >
              <Ionicons name="logo-twitter" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>

            <TouchableOpacity style={styles.row} onPress={rateApp}>
              <Ionicons name="star-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Rate the App</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('mailto:support@mysportspassport.app').catch(() => {})}>
              <Ionicons name="mail-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('mailto:request@mysportspassport.app').catch(() => {})}>
              <Ionicons name="mail-outline" size={26} color={styles.rowIcon.color} />
              <Text style={styles.label}>Request a League, Arena or Team</Text>
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal</Text>

            <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://mysportspassport.app/privacy.html').catch(() => {})}>
              <Text style={styles.link}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://mysportspassport.app/terms.html').catch(() => {})}>
              <Text style={styles.link}>Terms of Service</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.version}>
            <Text style={styles.versionText}>
              Version {Constants.expoConfig?.version || '3.3.1'}
            </Text>
          </View>

          {/* Log Out */}
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          {/* Custom Logout Modal */}
          <Modal visible={logoutModalVisible} transparent animationType="fade">
            <View style={styles.alertOverlay}>
              <View style={styles.alertContainer}>
                <Text style={styles.alertTitle}>Log out</Text>
                <Text style={styles.alertMessageText}>Are you sure you want to log out?</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }}>
                  <TouchableOpacity
                    onPress={() => setLogoutModalVisible(false)}
                    style={[styles.alertButton, { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#0D2C42' }]}
                  >
                    <Text style={[styles.alertButtonText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      setLogoutModalVisible(false);
                      try {
                        await auth.signOut();
                        router.dismissAll();
                        router.replace('/login');
                      } catch (error) {
                        // silent fail
                      }
                    }}
                    style={styles.alertButton}
                  >
                    <Text style={styles.alertButtonText}>Log Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Global Error Modal */}
          <Modal visible={alertVisible} transparent animationType="fade">
            <View style={styles.alertOverlay}>
              <View style={styles.alertContainer}>
                <Text style={styles.alertTitle}>{alertTitle}</Text>
                <Text style={styles.alertMessageText}>{alertMessage}</Text>
                <TouchableOpacity
                  onPress={() => setAlertVisible(false)}
                  style={styles.alertButton}
                >
                  <Text style={styles.alertButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Custom Delete Account Modal */}
          <Modal visible={deleteModalVisible} transparent animationType="fade">
            <View style={styles.alertOverlay}>
              <View style={styles.alertContainer}>
                <Text style={styles.alertTitle}>Delete Account</Text>
                <Text style={styles.alertMessageText}>This action cannot be undone. All your data will be permanently deleted.</Text>
                {isPasswordUser && (
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor="#888"
                    secureTextEntry
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    style={styles.deletePasswordInput}
                  />
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 }}>
                  <TouchableOpacity
                    onPress={() => setDeleteModalVisible(false)}
                    style={[styles.alertButton, { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#0D2C42' }]}
                  >
                    <Text style={[styles.alertButtonText, { color: colorScheme === 'dark' ? '#FFFFFF' : '#0D2C42' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      try {

                        if (!auth.currentUser) return;

                        if (isPasswordUser) {
                          const credential = EmailAuthProvider.credential(
                            auth.currentUser.email!,
                            deletePassword
                          );

                          await reauthenticateWithCredential(auth.currentUser, credential);
                        }
                        setDeleteModalVisible(false);

                        router.dismissAll();
                        router.replace("/login");

                        const functions = getFunctions();
                        const deleteUser = httpsCallable(functions, "deleteUserAccount");

                        await deleteUser();

                        await auth.signOut();

                      } catch (error) {

                        setAlertTitle('Password Incorrect');
                        setAlertMessage('Enter your password to confirm account deletion.');
                        setAlertVisible(true);

                      }
                    }}

                    style={[styles.alertButton, { backgroundColor: '#EF4444' }]}
                  >
                    <Text style={styles.alertButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </View>
  );
}