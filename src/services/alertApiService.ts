/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { apiClient } from './apiClient';

export interface AlertRecord {
  id?: string;
  aisId: string;
  type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  latitude?: number;
  longitude?: number;
  acknowledged?: boolean;
}

class AlertApiService {
  async getUnacknowledgedAlerts(severity?: string): Promise<AlertRecord[]> {
    const endpoint = severity ? `/api/alerts/unacknowledged?severity=${severity}` : '/api/alerts/unacknowledged';
    const res = await apiClient.get<AlertRecord[]>(endpoint);
    if (res.success && res.data) {
      return res.data;
    }
    return [];
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy = 'Coast Guard Command') {
    return await apiClient.post(`/api/alerts/${alertId}/acknowledge`, { acknowledgedBy });
  }

  async getVesselAlerts(aisId: string): Promise<AlertRecord[]> {
    const res = await apiClient.get<AlertRecord[]>(`/api/alerts/vessel/${aisId}`);
    if (res.success && res.data) {
      return res.data;
    }
    return [];
  }
}

export const alertApiService = new AlertApiService();
export default alertApiService;
