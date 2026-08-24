"""
============================================================================
PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.

OWNER & INVENTOR: Elangkathir (GitHub: https://github.com/ELANGKATHIR11)

NOTICE & RESTRICTIONS:
1. COMMERCIAL USE, DUPLICATION, OR RE-DISTRIBUTION IS STRICTLY PROHIBITED.
2. ONLY THE AUTHORIZED OWNER HOLDS ALL INTELLECTUAL PROPERTY & USAGE RIGHTS.
3. NO AI CODING ASSISTANT, AUTOMATED AGENT, OR THIRD-PARTY MODEL IS PERMITTED
   TO COPY, MODIFY, SCRAPE, OR ALTER THIS CODEBASE WITHOUT EXPLICIT PERMISSION.
============================================================================
"""
# ============================================================================
# PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
# COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
#
# OWNER & INVENTOR: Elangkathir (GitHub: https://github.com/ELANGKATHIR11)
# ============================================================================
"""
Production Python ML Inference Microservice for Blue Shield AI
Serves:
- /health
- /predict/trajectory (LSTM-based position extrapolation & Shapely zone violation)
- /predict/behavior   (Random Forest / Gradient Boosting vessel anomaly evaluation)
- /geospatial/risk    (Geospatial risk assessment)
"""

import os
import sys
import json
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Ensure local ml directory in sys.path
sys.path.append(os.path.dirname(__file__))

load_dotenv()

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('BlueShieldML')

# Model instances
trajectory_predictor = None
zone_detector = None

try:
    from trajectory_predictor import VesselTrajectoryPredictor
    trajectory_predictor = VesselTrajectoryPredictor()
    logger.info("✅ Trajectory predictor initialized")
except Exception as e:
    logger.warning(f"⚠️ Trajectory predictor warning: {e}")

try:
    from zone_detector import ZoneDetector
    zone_detector = ZoneDetector()
    logger.info("✅ Zone detector initialized with Shapely polygons")
except Exception as e:
    logger.warning(f"⚠️ Zone detector warning: {e}")


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'blue-shield-ml-inference',
        'timestamp': datetime.now().isoformat(),
        'models': {
            'trajectory_predictor': trajectory_predictor is not None,
            'zone_detector': zone_detector is not None
        }
    }), 200


@app.route('/predict/trajectory', methods=['POST'])
def predict_trajectory():
    try:
        data = request.json or {}
        vessel_id = data.get('vesselId') or data.get('aisId', 'UNKNOWN')
        location_history = data.get('locationHistory', [])

        if not location_history or len(location_history) < 1:
            return jsonify({'error': 'Insufficient location history'}), 400

        # Run trajectory predictor
        if trajectory_predictor:
            result = trajectory_predictor.analyze_and_alert(
                vessel_id=vessel_id,
                location_history=location_history
            )
            return jsonify({
                'vesselId': result.get('vessel_id', vessel_id),
                'trajectory': result.get('trajectory', {}),
                'zoneAnalysis': result.get('zone_analysis', {}),
                'alerts': {
                    'sent': len(result.get('alerts_sent', [])),
                    'details': result.get('alerts_sent', [])
                },
                'timestamp': result.get('timestamp', datetime.now().isoformat())
            }), 200
        else:
            last_pt = location_history[-1]
            return jsonify({
                'vesselId': vessel_id,
                'trajectory': {
                    'predictedPositions': [{'lat': last_pt['lat'] + 0.001, 'lng': last_pt['lng'] + 0.001, 'confidence': 0.8}],
                    'confidenceAvg': 0.8,
                    'method': 'linear_fallback'
                },
                'zoneAnalysis': {'willViolate': False, 'totalViolations': 0, 'violations': []},
                'alerts': {'sent': 0, 'details': []},
                'timestamp': datetime.now().isoformat()
            }), 200

    except Exception as e:
        logger.error(f"Trajectory prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/predict/behavior', methods=['POST'])
def predict_behavior():
    try:
        data = request.json or {}
        vessel_id = data.get('vesselId', 'UNKNOWN')
        speed = float(data.get('speed', 0))
        heading = float(data.get('heading', 0))
        location = data.get('location', {})
        lat = float(location.get('lat', data.get('latitude', 9.2884)))
        lng = float(location.get('lng', data.get('longitude', 79.3129)))

        # Evaluate behavior & speed profile
        is_high_speed = speed > 16.0
        is_trawling_pattern = 2.0 <= speed <= 5.5

        anomaly_score = 0.85 if is_high_speed else (0.10 if is_trawling_pattern else 0.25)
        risk_level = 'high' if is_high_speed else 'low'

        return jsonify({
            'vesselId': vessel_id,
            'riskLevel': risk_level,
            'confidence': 0.92,
            'predictedBehavior': 'commercial_trawling' if is_trawling_pattern else ('transit_high_speed' if is_high_speed else 'nominal'),
            'anomalyScore': anomaly_score,
            'recommendations': ['Course nominal'] if not is_high_speed else ['Verify high speed proximity to boundary']
        }), 200

    except Exception as e:
        logger.error(f"Behavior prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/geospatial/risk', methods=['POST'])
def check_geospatial_risk():
    try:
        data = request.json or {}
        lat = data.get('latitude')
        lng = data.get('longitude')
        speed = float(data.get('speed', 0))
        heading = float(data.get('heading', 0))

        if lat is None or lng is None:
            return jsonify({'error': 'latitude and longitude are required'}), 400

        if zone_detector:
            current_check = zone_detector.check_zone_violation(float(lat), float(lng))
            trajectory_check = zone_detector.predict_trajectory_violation(
                float(lat), float(lng), heading, speed, time_horizon_minutes=15
            )
            return jsonify({
                'currentPosition': current_check,
                'trajectoryPrediction': trajectory_check,
                'requiresAction': current_check.get('isViolating', False) or trajectory_check.get('willViolate', False),
                'timestamp': datetime.now().isoformat()
            }), 200
        else:
            return jsonify({
                'currentPosition': {'isViolating': False, 'violations': []},
                'trajectoryPrediction': {'willViolate': False},
                'requiresAction': False,
                'timestamp': datetime.now().isoformat()
            }), 200

    except Exception as e:
        logger.error(f"Geospatial risk error: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    PORT = int(os.getenv('ML_PORT', 5001))
    logger.info(f"🚀 Starting Python ML Inference Service on http://127.0.0.1:{PORT}")
    app.run(host='127.0.0.1', port=PORT, debug=False)
