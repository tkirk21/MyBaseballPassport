//types/friends.ts
import { Timestamp } from "firebase/firestore";

export interface Profile {
  id: string;
  name: string;
  imageUrl?: string | null;
  location?: string;
  favouriteTeam?: string;
}

export interface Checkin {
  id: string;
  timestamp: Timestamp | Date;
  arenaName?: string;
  arena?: string;
  league?: string;
  teamName?: string;
  opponent?: string;
  userId: string;
}

export interface ActivityItem {
  id: string;
  friendId: string;
  type: "checkin" | "cheer" | "friendship" | string;
  timestamp: Timestamp | Date;
  metadata?: Record<string, unknown>;
}

export interface Chirp {
  id: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  text: string;
  timestamp: Timestamp | Date;
}