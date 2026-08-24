/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { apiClient } from './apiClient';
import { BoatData } from '../App';
import { offlineStorageService } from './offlineStorageService';

export interface RegisterVesselPayload {
  aisId: string;
  boatId: string;
  fishermanName: string;
  contactInfo: string;
  vesselType?: string;
}

export interface TelemetryIngestPayload {
  vesselId: string;
  aisId?: string;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
  source?: 'browser-gps' | 'ais' | 'onboard-gps' | 'iot';
}

class VesselApiService {
  async registerVessel(payload: RegisterVesselPayload) {
    return await apiClient.post('/api/vessels/register', payload);
  }

  /**
   * Send live GPS telemetry to canonical /api/telemetry endpoint with offline queue fallback
   */
  async sendTelemetry(telemetry: TelemetryIngestPayload) {
    const payload = {
      vesselId: telemetry.vesselId || telemetry.aisId,
      latitude: telemetry.lat !== undefined ? telemetry.lat : telemetry.latitude,
      longitude: telemetry.lng !== undefined ? telemetry.lng : telemetry.longitude,
      accuracy: telemetry.accuracy || 5,
      altitude: telemetry.altitude || 0,
      speed: telemetry.speed || 0,
      heading: telemetry.heading || 0,
      timestamp: telemetry.timestamp || Date.now(),
      source: telemetry.source || 'browser-gps'
    };

    try {
      const res = await apiClient.post('/api/telemetry', payload);
      if (res && res.success) {
        // Sync any queued offline packets now that we are online
        this.flushOfflineQueue().catch(() => {});
        return res;
      }
      throw new Error(res?.error?.message || 'Server rejected telemetry');
    } catch (error) {
      console.warn('📡 Network unavailable, storing telemetry in persistent offline IndexedDB queue:', error.message);
      await offlineStorageService.queueTelemetry({
        vesselId: payload.vesselId!,
        latitude: payload.latitude!,
        longitude: payload.longitude!,
        accuracy: payload.accuracy,
        altitude: payload.altitude,
        speed: payload.speed,
        heading: payload.heading,
        timestamp: payload.timestamp,
        source: 'browser-gps'
      });
      return {
        success: true,
        offline: true,
        message: 'Telemetry buffered locally in offline store'
      };
    }
  }

  /**
   * Flush pending telemetry queue upon reconnection
   */
  async flushOfflineQueue(): Promise<number> {
    const queue = await offlineStorageService.getPendingQueue();
    if (!queue || queue.length === 0) return 0;

    let syncedCount = 0;
    for (const item of queue) {
      try {
        const res = await apiClient.post('/api/telemetry', {
          vesselId: item.vesselId,
          latitude: item.latitude,
          longitude: item.longitude,
          accuracy: item.accuracy,
          altitude: item.altitude,
          speed: item.speed,
          heading: item.heading,
          timestamp: item.capturedAt,
          source: 'browser-gps'
        });

        if (res && res.success) {
          await offlineStorageService.markSynced(item.id);
          syncedCount++;
        }
      } catch {
        break; // Stop flushing if network disconnected again
      }
    }

    if (syncedCount > 0) {
      console.log(`✅ Flushed and synchronized ${syncedCount} offline GPS telemetry packets to backend`);
    }
    return syncedCount;
  }

  async getActiveVessels(): Promise<BoatData[]> {
    const res = await apiClient.get('/api/vessels/active');
    if (res.success && res.data) {
      return res.data;
    }
    return [];
  }

  async updateVesselStatus(aisId: string, status: 'safe' | 'warning' | 'danger') {
    return await apiClient.patch(`/api/vessels/${aisId}/status`, { status });
  }

  async getVesselHistory(aisId: string, limit = 50) {
    return await apiClient.get(`/api/vessels/${aisId}/history?limit=${limit}`);
  }
}

export const vesselApiService = new VesselApiService();
export default vesselApiService;
