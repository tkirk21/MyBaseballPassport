//functions/src/index.tsx
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp({
  storageBucket: "mybaseballpassport.firebasestorage.app",
});

const db = admin.firestore();

/* ============================
   DELETE USER ACCOUNT
============================ */
export const deleteUserAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const uid = request.auth.uid;
  const bucket = admin.storage().bucket();

  try {
    // SAFETY: Ensure user actually exists in auth
    await admin.auth().getUser(uid);

    // Efficient friend cleanup (O(F) not O(N))
    const userProfileRef = db.collection("profiles").doc(uid);

    // 1️⃣ Remove from friends
    const friendsSnap = await userProfileRef.collection("friends").get();

    for (const friendDoc of friendsSnap.docs) {
      const otherUid = friendDoc.id;

      try {
        await db.collection("profiles")
          .doc(otherUid)
          .collection("friends")
          .doc(uid)
          .delete();
      } catch (err) {
        console.error("Friend mirror delete failed:", otherUid, err);
      }
    }

    // 2️⃣ Remove outgoing friend requests
    const sentSnap = await userProfileRef.collection("sentFriendRequests").get();

    for (const sentDoc of sentSnap.docs) {
      const otherUid = sentDoc.id;

      try {
        await db.collection("profiles")
          .doc(otherUid)
          .collection("friendRequests")
          .doc(uid)
          .delete();
      } catch (err) {
        console.error("Sent request mirror delete failed:", otherUid, err);
      }
    }

    // 3️⃣ Remove incoming friend requests
    const receivedSnap = await userProfileRef.collection("friendRequests").get();

    for (const receivedDoc of receivedSnap.docs) {
      const otherUid = receivedDoc.id;

      try {
        await db.collection("profiles")
          .doc(otherUid)
          .collection("sentFriendRequests")
          .doc(uid)
          .delete();
      } catch (err) {
        console.error("Incoming request mirror delete failed:", otherUid, err);
      }
    }

    // Recursively delete profile tree
    try {
      await admin.firestore().recursiveDelete(
        db.collection("profiles").doc(uid)
      );
    } catch (err) {
      console.error("Recursive profile delete failed:", err);
    }

    // Delete public leaderboard entry
    try {
      await db.collection("publicLeaderboard").doc(uid).delete();
    } catch (err) {
      console.error("Public leaderboard delete failed:", err);
    }

    // Delete storage folders safely
    try {
      await bucket.deleteFiles({ prefix: `profilePictures/${uid}` });
    } catch (err) {
      console.error("Profile picture delete failed:", err);
    }

    try {
      await bucket.deleteFiles({ prefix: `checkins/${uid}` });
    } catch (err) {
      console.error("Checkins folder delete failed:", err);
    }

    // Delete auth user LAST
    try {
      await admin.auth().deleteUser(uid);
    } catch (err) {
      console.error("Auth delete failed:", err);
      throw new HttpsError("internal", "Auth deletion failed.");
    }

    return { success: true };

  } catch (error) {
    console.error("Account deletion failed:", error);
    throw new HttpsError("internal", "Account deletion failed.");
  }
});

/* ============================
   SEND PUSH NOTIFICATION
============================ */

export const sendPushNotification = onCall(async (request) => {

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { targetUid, title, body } = request.data;

  if (!targetUid || !title || !body) {
    throw new HttpsError("invalid-argument", "Missing fields.");
  }

  try {
    const profileSnap = await db.collection("profiles").doc(targetUid).get();

    if (!profileSnap.exists) {
      return { success: false };
    }

    const pushToken = profileSnap.data()?.pushToken;

    if (!pushToken) {
      return { success: false };
    }

    const message = {
      to: pushToken,
      sound: "default",
      title,
      body,
      data: { targetUid },
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error("Expo push failed:", await response.text());
      return { success: false };
    }

    return { success: true };

  } catch (error) {
    console.error("sendPushNotification failed:", error);
    throw new HttpsError("internal", "Push failed.");
  }
});

/* ============================
   FRIEND REQUEST TRIGGER
============================ */
export const onFriendRequest = onDocumentCreated(
  {
    document: "profiles/{targetUid}/friendRequests/{requestId}",
  },
  async (event) => {

    try {
      const snapshot = event.data;
      if (!snapshot) return;

      const targetUid = event.params.targetUid;
      const requestData = snapshot.data();

      const senderUid = requestData?.fromId;
      if (!senderUid) {
        console.log("No senderUid found in document");
        return;
      }

      const senderProfile = await db.collection("profiles").doc(senderUid).get();
      const senderName = senderProfile.data()?.name || "Someone";

      const targetProfile = await db.collection("profiles").doc(targetUid).get();
      const pushToken = targetProfile.data()?.pushToken;

      console.log("Target push token:", pushToken);

      if (!pushToken) {
        console.log("No pushToken found for target user");
        return;
      }

      const message = {
        to: pushToken,
        sound: "default",
        title: "New Friend Request",
        body: `${senderName} sent you a friend request.`,
        data: { type: "friend_request" },
      };

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const expoResult = await response.json();
      console.log("Expo push response:", expoResult);

      if (!response.ok) {
        console.error("Friend request push failed:", expoResult);
      }

    } catch (error) {
      console.error("onFriendRequest trigger failed:", error);
    }
  }
);
/* ============================
   CHEER TRIGGER
============================ */

export const onCheerAdded = onDocumentCreated(
  "profiles/{ownerUid}/checkins/{checkinId}/cheers/{cheerId}",
  async (event) => {

    try {
      const snapshot = event.data;
      if (!snapshot) return;

      const ownerUid = event.params.ownerUid;
      const checkinId = event.params.checkinId;
      const cheerData = snapshot.data();

      const senderUid = cheerData?.userId;
      if (!senderUid || senderUid === ownerUid) return;

      const checkinSnap = await db
        .collection("profiles")
        .doc(ownerUid)
        .collection("checkins")
        .doc(checkinId)
        .get();

      const arenaName = checkinSnap.data()?.arenaName || "check-in";
      const senderProfile = await db.collection("profiles").doc(senderUid).get();
      const senderName = senderProfile.data()?.name || "Someone";

      const ownerProfile = await db.collection("profiles").doc(ownerUid).get();
      const pushToken = ownerProfile.data()?.pushToken;

      if (!pushToken) return;

     const message = {
       to: pushToken,
       sound: "default",
       title: "New Cheer",
       body: `${senderName} cheered your ${arenaName} check-in.`,
       data: { type: "cheer" },
     };

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error("Cheer push failed:", await response.text());
      }

    } catch (error) {
      console.error("onCheerAdded trigger failed:", error);
    }
  }
);

/* ============================
   CHIRP TRIGGER
============================ */

export const onChirpAdded = onDocumentCreated(
  "profiles/{ownerUid}/checkins/{checkinId}/chirps/{chirpId}",
  async (event) => {

    try {
      const snapshot = event.data;
      if (!snapshot) return;

      const ownerUid = event.params.ownerUid;
      const checkinId = event.params.checkinId;
      const chirpData = snapshot.data();

      const checkinSnap = await db
        .collection("profiles")
        .doc(ownerUid)
        .collection("checkins")
        .doc(checkinId)
        .get();

      const arenaName = checkinSnap.data()?.arenaName || "check-in";

      const senderUid = chirpData?.userId;
      if (!senderUid || senderUid === ownerUid) return;

      const senderProfile = await db.collection("profiles").doc(senderUid).get();
      const senderName = senderProfile.data()?.name || "Someone";

      const ownerProfile = await db.collection("profiles").doc(ownerUid).get();
      const pushToken = ownerProfile.data()?.pushToken;

      if (!pushToken) return;

      const message = {
        to: pushToken,
        sound: "default",
        title: "New Comment",
        body: `${senderName} commented on your ${arenaName} check-in.`,
        data: { type: "chirp" },
      };

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error("Chirp push failed:", await response.text());
      }

    } catch (error) {
      console.error("onChirpAdded trigger failed:", error);
    }
  }
);

export const deleteCheckin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }

  const { checkinId, folderName } = request.data;
  const uid = request.auth.uid;

  if (!checkinId) {
    throw new HttpsError("invalid-argument", "Missing checkinId.");
  }

  try {
    const bucket = admin.storage().bucket();

    // Verify checkin exists and belongs to user
    const checkinRef = db.collection("profiles")
      .doc(uid)
      .collection("checkins")
      .doc(checkinId);

    const checkinSnap = await checkinRef.get();

    if (!checkinSnap.exists) {
      throw new HttpsError("not-found", "Checkin not found.");
    }

    // Firestore delete
    try {
      await admin.firestore().recursiveDelete(checkinRef);
    } catch (err) {
      console.error("Recursive delete failed:", err);
      throw new HttpsError("internal", "Firestore deletion failed.");
    }

    // Storage delete (non-critical)
    if (folderName) {
      try {
        await bucket.deleteFiles({
          prefix: `checkins/${uid}/${folderName}`
        });
      } catch (err) {
        console.error("Storage folder delete failed:", err);
      }
    }

    return { success: true };

  } catch (error) {
    console.error("Checkin deletion failed:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", "Deletion failed.");
  }
});

/* ============================
   FRIEND CHECKIN NOTIFACTION
============================ */
export const onFriendCheckin = onDocumentCreated(
  "profiles/{userUid}/checkins/{checkinId}",
  async (event) => {

    try {
      const snapshot = event.data;
      if (!snapshot) return;

      const userUid = event.params.userUid;
      const checkinData = snapshot.data();

      const arenaName = checkinData?.arenaName || "an arena";

      // Get user profile
      const userProfile = await db.collection("profiles").doc(userUid).get();
      const userName = userProfile.data()?.name || "Your friend";

      // Get all friends
      const friendsSnap = await db
        .collection("profiles")
        .doc(userUid)
        .collection("friends")
        .get();

      if (friendsSnap.empty) return;

      const messages: any[] = [];

      for (const friendDoc of friendsSnap.docs) {

        const friendUid = friendDoc.id;

        const friendProfile = await db
          .collection("profiles")
          .doc(friendUid)
          .get();

        const pushToken = friendProfile.data()?.pushToken;

        if (!pushToken) continue;

        messages.push({
          to: pushToken,
          sound: "default",
          title: "New Check-In",
          body: `${userName} just checked in at ${arenaName}`,
          data: { type: "friend_checkin", userUid }
        });
      }

      if (messages.length === 0) return;

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

    } catch (error) {
      console.error("onFriendCheckin failed:", error);
    }
  }
);