// components/friends/cheerButton.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseApp from '@/firebaseConfig';
import { useColorScheme } from '../../hooks/useColorScheme';

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

type Props = {
  friendId: string;
  checkinId: string;
};

export default function CheerButton({ friendId, checkinId }: Props) {
  const [cheerCount, setCheerCount] = useState(0);
  const [cheerNames, setCheerNames] = useState<string[]>([]);
  const colorScheme = useColorScheme();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('Error');
  const [alertMessage, setAlertMessage] = useState('');
  const user = auth.currentUser;
  if (!user || !friendId || !checkinId) return null;

  useEffect(() => {
    const loadCheers = async () => {
      if (!friendId || !checkinId) return;

      try {
        const cheersRef = collection(db, "profiles", friendId, "checkins", checkinId, "cheers");

        const snap = await getDocs(cheersRef);

        if (!snap || !snap.docs) {
          setCheerCount(0);
          setCheerNames([]);
          return;
        }

        setCheerCount(snap.size || 0);
        setCheerNames(
          snap.docs.map(d => {
            const data = d.data();
            return data?.name ? data.name : "Someone";
          })
        );

      } catch (err: any) {

        if (err?.code === "permission-denied") {
          setAlertTitle("Permission Denied");
          setAlertMessage("You do not have permission to view cheers.");
          setAlertVisible(true);
        } else if (err?.code === "unavailable") {
          setAlertTitle("Network Error");
          setAlertMessage("Network unavailable while loading cheers.");
          setAlertVisible(true);
        } else {
          setAlertTitle("Cheer Load Failed");
          setAlertMessage(err?.message || "Unknown error while loading cheers.");
          setAlertVisible(true);
        }

        setCheerCount(0);
        setCheerNames([]);
      }
    };

    loadCheers();
  }, [friendId, checkinId]);

  const handleCheerPress = async () => {
    if (!auth.currentUser) {
      console.warn("Auth state invalid.");
      return;
    }

    let userId: string;

    try {
      userId = auth.currentUser.uid;
      await auth.currentUser.getIdToken();
    } catch (err) {
      console.error("Auth token expired or invalid:", err);
      return;
    }

    let userName = "Anonymous";
    try {
      const profileDoc = await getDoc(doc(db, "profiles", userId));
      if (profileDoc.exists() && profileDoc.data()?.name) {
        userName = profileDoc.data()?.name;
      }
    } catch (err) {}

    let cheerRef;
    let existing = null;

    try {
      cheerRef = doc(db, "profiles", friendId, "checkins", checkinId, "cheers", userId);

      const cheersCollection = collection(db, "profiles", friendId, "checkins", checkinId, "cheers");

      const cheersSnap = await getDocs(cheersCollection);

      if (cheersSnap && cheersSnap.docs) {
        existing = cheersSnap.docs.find(d => d.id === userId);
      }

        } catch (err: any) {

          if (err?.code === "permission-denied") {
            setAlertTitle("Permission Denied");
            setAlertMessage("You do not have permission to modify this cheer.");
            setAlertVisible(true);
          } else if (err?.code === "unavailable") {
            setAlertTitle("Network Error");
            setAlertMessage("Network unavailable while checking cheer status.");
            setAlertVisible(true);
          } else {
            setAlertTitle("Cheer Check Failed");
            setAlertMessage(err?.message || "Unknown error while checking cheer.");
            setAlertVisible(true);
          }

          return;
        }

    try {

      if (!cheerRef) return;

      if (existing) {

        try {
          await deleteDoc(cheerRef);

          setCheerCount(c => Math.max(0, c - 1));
          setCheerNames(names => names.filter(n => n !== userName));

        } catch (err: any) {

          if (err?.code === "permission-denied") {
            setAlertTitle("Permission Denied");
            setAlertMessage("You do not have permission to remove this cheer.");
            setAlertVisible(true);
          } else if (err?.code === "unavailable") {
            setAlertTitle("Network Error");
            setAlertMessage("Network lost while removing cheer.");
            setAlertVisible(true);
          } else {
            setAlertTitle("Cheer Remove Failed");
            setAlertMessage(err?.message || "Unknown error while removing cheer.");
            setAlertVisible(true);
          }

          return;
        }

      } else {

        try {
          await setDoc(cheerRef, {
            name: userName,
            userId,
            actorId: userId,
            targetId: friendId,
            checkinId,
            timestamp: serverTimestamp(),
            type: "cheer"
          });

          setCheerCount(c => c + 1);
          setCheerNames(names => [...names, userName]);

        } catch (err: any) {

          if (err?.code === "permission-denied") {
            setAlertTitle("Permission Denied");
            setAlertMessage("You do not have permission to add a cheer here.");
            setAlertVisible(true);
          } else if (err?.code === "unavailable") {
            setAlertTitle("Network Error");
            setAlertMessage("Network lost while adding cheer.");
            setAlertVisible(true);
          } else {
            setAlertTitle("Cheer Add Failed");
            setAlertMessage(err?.message || "Unknown error while adding cheer.");
            setAlertVisible(true);
          }

          return;
        }
      }

    } catch (err) {
      console.error("Unexpected cheer toggle failure:", err);
    }
  };

  const styles = {
    alertOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    alertContainer: { backgroundColor: colorScheme === 'dark' ? '#0F1E33' : '#FFFFFF', borderRadius: 16, padding: 24, width: '90%', maxWidth: 320, alignItems: 'center', borderWidth: 3, borderColor: '#0D2C42' },
    alertTitle: { fontSize: 16, fontWeight: '700', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', textAlign: 'center', marginBottom: 12 },
    alertMessageText: { fontSize: 14, color: colorScheme === 'dark' ? '#CCCCCC' : '#374151', textAlign: 'center', marginBottom: 20 },
    alertButton: { backgroundColor: '#0D2C42', paddingVertical: 10, paddingHorizontal: 28, borderRadius: 30 },
    alertButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    badge: { position: "absolute", top: -8, right: -8, backgroundColor: "#0A2940",borderRadius: 10, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff", },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    button: { backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#E0E7FF', paddingHorizontal: 7, paddingVertical: 6, borderRadius: 30, minWidth: 55, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#2F4F68", marginLeft: -20, },
    container: { marginLeft: -12, alignItems: "flex-start", },
    nameText: { color: colorScheme === 'dark' ? '#fff' : '#0A2940', fontSize: 11, marginTop: 2, },
    namesContainer: { marginTop: 4, },
    text: { color: colorScheme === 'dark' ? '#fff' : '#0A2940', fontSize: 10, fontWeight: "bold", }
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity onPress={handleCheerPress} style={styles.button} activeOpacity={0.7}>
          <Text style={styles.text}>Cheer🎉</Text>
          {cheerCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cheerCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {cheerCount > 0 && (
          <View style={styles.namesContainer}>
            {cheerNames.map((name, i) => (
              <Text key={i} style={styles.nameText}>{name}</Text>
            ))}
          </View>
        )}
      </View>

      <Modal visible={alertVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <Text style={styles.alertTitle}>{alertTitle}</Text>
            <Text style={styles.alertMessageText}>{alertMessage}</Text>
            <TouchableOpacity onPress={() => setAlertVisible(false)} style={styles.alertButton}>
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}



