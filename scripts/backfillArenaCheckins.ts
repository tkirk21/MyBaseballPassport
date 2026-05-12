import { getFirestore, collection, collectionGroup, getDocs, doc, setDoc } from 'firebase/firestore';
import firebaseApp from '@/firebaseConfig';
import arenaData from '@/assets/data/arenas.json';
import arenaHistoryData from '@/assets/data/arenaHistory.json';
import historicalArenasData from '@/assets/data/historicalTeams.json';

const db = getFirestore(firebaseApp);

export async function backfillArenaCheckins() {
  const allCheckins = await getDocs(collectionGroup(db, 'checkins'));

  for (const checkin of allCheckins.docs) {
    const data = checkin.data();

    const historyEntry = arenaHistoryData.find(h =>
      h.currentArena === data.arenaName ||
      h.history.some(old => old.name === data.arenaName)
    );

    let arenaMatch = arenaData.find(a =>
      a.arena === data.arenaName ||
      a.arena === historyEntry?.currentArena
    );

    if (!arenaMatch) {
      arenaMatch = historicalArenasData.find(a =>
        a.arena === data.arenaName ||
        a.teamName === data.teamName
      );
    }

    if (!arenaMatch) continue;

    await setDoc(
      doc(db, 'arenas', arenaMatch.arenaId),
      {
        arenaName: arenaMatch.arena,
      },
      { merge: true }
    );

    const targetRef = doc(
      db,
      'arenas',
      arenaMatch.arenaId,
      'checkins',
      checkin.id
    );

    await setDoc(targetRef, data, { merge: true });
  }

  const allArenaDocs = await getDocs(collection(db, 'arenas'));

  for (const arenaDoc of allArenaDocs.docs) {
    const snap = await getDocs(collection(db, 'arenas', arenaDoc.id, 'checkins'));

    await setDoc(
      doc(db, 'arenas', arenaDoc.id),
      {
        totalCheckins: snap.size,
      },
      { merge: true }
    );
  }

  console.log('BACKFILL COMPLETE');
}