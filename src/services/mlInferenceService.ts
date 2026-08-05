import { BoatData } from '../App';

export interface MLPredictionResult {
  isFishingProbability: number;
  anomalyScore: number;
  riskLevel: 'SAFE' | 'WARNING' | 'DANGER';
  recommendedActionTa: string;
  recommendedActionEn: string;
  timestamp: number;
}

class MLInferenceService {
  private apiEndpoint = 'http://localhost:8000/api/v1/telemetry/evaluate';

  /**
   * Evaluate vessel live GPS telemetry using Python ML models (Random Forest / Gradient Boosting)
   * with pure mathematical fallback if backend offline.
   */
  async predictLiveTelemetry(boat: BoatData): Promise<MLPredictionResult> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ais_id: boat.aisId,
          boat_id: boat.boatId,
          latitude: boat.location.lat,
          longitude: boat.location.lng,
          speed_knots: boat.speed,
          heading_deg: boat.heading,
          timestamp_ms: boat.location.timestamp || Date.now()
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          isFishingProbability: data.risk_score / 100.0,
          anomalyScore: data.is_anomaly ? 85.0 : 15.0,
          riskLevel: data.risk_level as 'SAFE' | 'WARNING' | 'DANGER',
          recommendedActionTa: data.recommended_action_ta,
          recommendedActionEn: data.recommended_action_en,
          timestamp: Date.now()
        };
      }
    } catch (e) {
      console.warn('📡 ML Backend offline, switching to edge local model inference:', e);
    }

    // Mathematical Edge Fallback Inference
    const imblLat = 9.9200;
    const imblLng = 79.5200;
    const dLat = (boat.location.lat - imblLat) * 111.0;
    const dLng = (boat.location.lng - imblLng) * 111.0 * Math.cos((boat.location.lat * Math.PI) / 180);
    const distKm = Math.sqrt(dLat * dLat + dLng * dLng);

    const isDanger = distKm < 1.0 || boat.status === 'danger';
    const isWarning = distKm < 3.0 || boat.status === 'warning';

    return {
      isFishingProbability: isDanger ? 0.95 : isWarning ? 0.65 : 0.15,
      anomalyScore: boat.speed > 15.0 ? 80.0 : 20.0,
      riskLevel: isDanger ? 'DANGER' : isWarning ? 'WARNING' : 'SAFE',
      recommendedActionTa: isDanger 
        ? 'அபாயம்: சர்வதேச எல்லை தாண்டியுள்ளீர்கள்! உடனடியாக திரும்புங்கள்.' 
        : 'பாதுகாப்பானது: இந்திய கடற்பகுதியில் இயங்குகிறது.',
      recommendedActionEn: isDanger 
        ? 'DANGER: Boundary breached! Turn back immediately.' 
        : 'SAFE: Operating normally in territorial waters.',
      timestamp: Date.now()
    };
  }
}

export const mlInferenceService = new MLInferenceService();
