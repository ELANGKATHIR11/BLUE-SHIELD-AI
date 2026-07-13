import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  FieldValue
} from "firebase/firestore";

export interface UserDetails {
  aisId: string;
  boatId: string;
  fishermanName: string;
  contactInfo: string;
  email?: string;
  createdAt: Timestamp | FieldValue;
  lastUpdated: Timestamp | FieldValue;
  status: "active" | "inactive";
  location?: {
    lat: number;
    lng: number;
    timestamp: number;
  };
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: Timestamp | FieldValue | number;
  priority: 'low' | 'medium' | 'high';
  status: 'sent' | 'delivered' | 'read';
  senderName?: string;
}

class UserService {
  private readonly usersCollection = "users";
  private readonly vesselsCollection = "vessels";
  private readonly messagesCollection = "messages";

  // Store user details in Firebase
  async storeUserDetails(
    userDetails: Omit<UserDetails, "createdAt" | "lastUpdated" | "status">,
  ): Promise<void> {
    try {
      const userRef = doc(db, this.usersCollection, userDetails.aisId);
      const userData: UserDetails = {
        ...userDetails,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        status: "active",
      };

      await setDoc(userRef, userData);
      console.log("✅ User details stored successfully:", userDetails.aisId);
    } catch (error) {
      console.error("❌ Error storing user details:", error);
      throw error;
    }
  }

  // Get user details by AIS ID
  async getUserDetails(aisId: string): Promise<UserDetails | null> {
    try {
      const userRef = doc(db, this.usersCollection, aisId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        return userSnap.data() as UserDetails;
      } else {
        console.log("ℹ️ No user found with AIS ID:", aisId);
        return null;
      }
    } catch (error) {
      console.error("❌ Error getting user details:", error);
      throw error;
    }
  }

  // Get all registered users
  async getAllUsers(): Promise<UserDetails[]> {
    try {
      const usersQuery = query(
        collection(db, this.usersCollection),
        where("status", "==", "active"),
      );
      const querySnapshot = await getDocs(usersQuery);

      const users: UserDetails[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserDetails);
      });

      console.log("✅ Retrieved all users:", users.length);
      return users;
    } catch (error) {
      console.error("❌ Error getting all users:", error);
      throw error;
    }
  }

  // Store vessel data in Firebase
  async storeVesselData(vesselData: VesselData): Promise<void> {
    try {
      const vesselRef = doc(db, this.vesselsCollection, vesselData.aisId);
      await setDoc(vesselRef, {
        ...vesselData,
        lastUpdated: serverTimestamp(),
      });
      console.log("✅ Vessel data stored successfully:", vesselData.aisId);
    } catch (error) {
      console.error("❌ Error storing vessel data:", error);
      throw error;
    }
  }

  // Get all vessels data
  async getAllVessels(): Promise<VesselData[]> {
    try {
      const vesselsQuery = query(collection(db, this.vesselsCollection));
      const querySnapshot = await getDocs(vesselsQuery);

      const vessels: VesselData[] = [];
      querySnapshot.forEach((doc) => {
        vessels.push(doc.data() as VesselData);
      });

      console.log("✅ Retrieved all vessels:", vessels.length);
      return vessels;
    } catch (error) {
      console.error("❌ Error getting all vessels:", error);
      throw error;
    }
  }

  // Subscribe to real-time vessel updates (All vessels)
  subscribeToVessels(callback: (vessels: VesselData[]) => void): () => void {
    const vesselsQuery = query(collection(db, this.vesselsCollection));
    
    const unsubscribe = onSnapshot(vesselsQuery, (snapshot) => {
      const vessels: VesselData[] = [];
      snapshot.forEach((doc) => {
        vessels.push(doc.data() as VesselData);
      });
      console.log('📡 Real-time update: ', vessels.length, 'vessels');
      callback(vessels);
    }, (error) => {
      console.error('❌ Error in vessel subscription:', error);
    });

    return unsubscribe;
  }

  // Subscribe to a specific vessel (Single vessel)
  subscribeToVessel(aisId: string, callback: (vessel: VesselData | null) => void): () => void {
    const vesselRef = doc(db, this.vesselsCollection, aisId);
    
    const unsubscribe = onSnapshot(vesselRef, (docSnap) => {
      if (docSnap.exists()) {
        const vessel = docSnap.data() as VesselData;
        console.log('📡 Real-time vessel update:', vessel.boatId);
        callback(vessel);
      } else {
        console.log('ℹ️ Vessel document does not exist (yet)');
        callback(null);
      }
    }, (error) => {
      console.error('❌ Error in single vessel subscription:', error);
    });

    return unsubscribe;
  }

  // Update user location
  async updateUserLocation(
    aisId: string,
    location: { lat: number; lng: number; timestamp: number },
  ): Promise<void> {
    try {
      const userRef = doc(db, this.usersCollection, aisId);
      await updateDoc(userRef, {
        location,
        lastUpdated: serverTimestamp(),
      });
      console.log("✅ User location updated:", aisId);
    } catch (error) {
      console.error("❌ Error updating user location:", error);
      throw error;
    }
  }

  // Update vessel status
  async updateVesselStatus(
    aisId: string,
    status: "safe" | "warning" | "danger",
  ): Promise<void> {
    try {
      const vesselRef = doc(db, this.vesselsCollection, aisId);
      await updateDoc(vesselRef, {
        status,
        lastUpdate: serverTimestamp(),
      });
      console.log("✅ Vessel status updated:", aisId, status);
    } catch (error) {
      console.error("❌ Error updating vessel status:", error);
      throw error;
    }
  }

  // Check if user exists
  async userExists(aisId: string): Promise<boolean> {
    try {
      const userRef = doc(db, this.usersCollection, aisId);
      const userSnap = await getDoc(userRef);
      return userSnap.exists();
    } catch (error) {
      console.error("❌ Error checking if user exists:", error);
      return false;
    }
  }

  // Send a message
  async sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'>): Promise<void> {
    try {
      const messageCol = collection(db, this.messagesCollection);
      const messageRef = doc(messageCol);
      const newMessage: Message = {
        ...message,
        id: messageRef.id,
        timestamp: serverTimestamp(),
        status: 'sent'
      };
      await setDoc(messageRef, newMessage);
      console.log("✅ Message sent successfully:", newMessage.id);
    } catch (error) {
      console.error("❌ Error sending message:", error);
      throw error;
    }
  }

  subscribeToMessages(
    aisId: string | null, 
    callback: (messages: Message[]) => void
  ): () => void {
    // If aisId is null, we are the Coast Guard (receive all messages)
    // If aisId is provided, we are a fisherman (receive messages to us OR from us)
    const q = query(collection(db, this.messagesCollection));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Message;
        // Client-side filtering if complex query is hard
        if (!aisId || data.senderId === aisId || data.receiverId === aisId) {
          messages.push(data);
        }
      });
      // Sort by timestamp
      messages.sort((a, b) => {
        const timeA = typeof a.timestamp === 'number' ? a.timestamp : ((a.timestamp as {seconds?: number})?.seconds || 0);
        const timeB = typeof b.timestamp === 'number' ? b.timestamp : ((b.timestamp as {seconds?: number})?.seconds || 0);
        return timeA - timeB;
      });
      callback(messages);
    }, (error) => {
      console.error('❌ Error in message subscription:', error);
    });

    return unsubscribe;
  }

  // Mark message as read
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, this.messagesCollection, messageId);
      await updateDoc(messageRef, {
        status: 'read'
      });
      console.log("✅ Message marked as read:", messageId);
    } catch (error) {
      console.error("❌ Error marking message as read:", error);
      throw error;
    }
  }


  // Delete a vessel document (digital twin cleanup)
  async deleteVessel(aisId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.vesselsCollection, aisId));
    } catch { /* ignore */ }
  }

  // GPS history (60s throttled writes for Spark plan compliance)
  private _lastHistoryWrite = new Map<string, number>();

  async storeGPSHistory(aisId: string, lat: number, lng: number, speed: number, heading: number): Promise<void> {
    const now = Date.now();
    const last = this._lastHistoryWrite.get(aisId) ?? 0;
    if (now - last < 60_000) return;
    this._lastHistoryWrite.set(aisId, now);
    try {
      await addDoc(collection(db, 'vessel_gps_history'), { aisId, lat, lng, speed, heading, timestamp: now, recordedAt: serverTimestamp() });
    } catch { /* ignore */ }
  }

  async getVesselGPSHistory(aisId: string, maxPts = 200): Promise<{ lat: number; lng: number; speed: number; heading: number; timestamp: number }[]> {
    try {
      const q = query(collection(db, 'vessel_gps_history'), where('aisId', '==', aisId), orderBy('timestamp', 'asc'), limit(maxPts));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as { lat: number; lng: number; speed: number; heading: number; timestamp: number });
    } catch { return []; }
  }

  // Sync to PostgreSQL / PostGIS database
  async logTelemetryToPostGIS(vesselData: any): Promise<void> {
    try {
      const response = await fetch('http://localhost:5000/api/vessels/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aisId: vesselData.aisId,
          boatId: vesselData.boatId,
          lat: vesselData.location.lat,
          lng: vesselData.location.lng,
          speed: vesselData.speed || 0,
          heading: vesselData.heading || 0
        })
      });
      const data = await response.json();
      console.log('📬 PostGIS Telemetry Logged:', data);
    } catch (error) {
      console.error('⚠️ Failed to sync telemetry to PostGIS:', error);
    }
  }
}

export interface VesselData {
  aisId: string;
  boatId: string;
  location: {
    lat: number;
    lng: number;
    timestamp: number;
  };
  status: "safe" | "warning" | "danger";
  speed: number;
  heading: number;
  lastUpdate: number;
  fishermanName?: string;
  contactInfo?: string;
}

export const userService = new UserService();
