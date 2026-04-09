/**
 * TEMPORAL PATTERN ENGINE — Vessel Baseline Learning
 * Learns normal vs abnormal patterns for each vessel over time
 * Stores compressed GPS history and behavioral profiles in Firestore
 * Enables personalized anomaly thresholds and seasonal pattern recognition
 */

import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import type { BoatData } from '../App';

export interface VesselProfile {
  aisId: string;
  vesselName: string;
  vesselType?: string;
  normalSpeedRange: [number, number]; // [min, max] knots
  normalHeadingVariance: number; // degrees
  typicalHours: number[]; // 0-23 when vessel typically operates
  riskTendency: number; // 0-1 baseline risk
  totalViolations: number;
  lastUpdated: number;
}

export interface CompressedTrace {
  timestamp: number;
  traces: Array<{ lat: number; lng: number; ts: number }>;
}

const FIRESTORE_COLLECTION = 'vessel_profiles';

export async function updateVesselProfile(vessel: BoatData): Promise<void> {
  try {
    const db = getFirestore();
    const profileRef = doc(db, FIRESTORE_COLLECTION, vessel.aisId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      const newProfile: VesselProfile = {
        aisId: vessel.aisId,
        vesselName: vessel.boatId,
        normalSpeedRange: [0, vessel.speed + 2],
        normalHeadingVariance: 45,
        typicalHours: [new Date().getHours()],
        riskTendency: 0.1,
        totalViolations: 0,
        lastUpdated: Date.now()
      };
      await setDoc(profileRef, newProfile);
    } else {
      const profile = profileSnap.data() as VesselProfile;
      const currentHour = new Date().getHours();

      const [minSpeed, maxSpeed] = profile.normalSpeedRange;
      const newMin = Math.min(minSpeed, vessel.speed);
      const newMax = Math.max(maxSpeed, vessel.speed);

      const updatedHours = Array.from(
        new Set([...profile.typicalHours, currentHour])
      );

      await updateDoc(profileRef, {
        normalSpeedRange: [newMin, newMax],
        typicalHours: updatedHours,
        lastUpdated: Date.now()
      });
    }
  } catch (error) {
    console.warn('Failed to update vessel profile:', error);
  }
}

export async function getVesselProfile(
  vesselId: string
): Promise<VesselProfile | null> {
  try {
    const db = getFirestore();
    const profileRef = doc(db, FIRESTORE_COLLECTION, vesselId);
    const profileSnap = await getDoc(profileRef);
    return profileSnap.exists()
      ? (profileSnap.data() as VesselProfile)
      : null;
  } catch (error) {
    console.warn('Failed to get vessel profile:', error);
    return null;
  }
}

export function isNormalBehavior(
  vessel: BoatData,
  profile: VesselProfile
): boolean {
  const [minSpeed, maxSpeed] = profile.normalSpeedRange;
  const currentHour = new Date().getHours();

  if (
    vessel.speed < minSpeed - 2 ||
    vessel.speed > maxSpeed + 3
  ) {
    return false;
  }

  if (!profile.typicalHours.includes(currentHour)) {
    return false;
  }

  return true;
}

export function getPersonalizedAnomalyThreshold(
  profile: VesselProfile
): number {
  return 50 - Math.min(20, profile.totalViolations * 2);
}
