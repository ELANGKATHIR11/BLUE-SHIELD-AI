# ============================================================================
# PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
# COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
#
# OWNER & INVENTOR: Elangkathir (GitHub: https://github.com/ELANGKATHIR11)
# 
# NOTICE & RESTRICTIONS:
# 1. COMMERCIAL USE, DUPLICATION, OR RE-DISTRIBUTION IS STRICTLY PROHIBITED.
# 2. ONLY THE AUTHORIZED OWNER HOLDS ALL INTELLECTUAL PROPERTY & USAGE RIGHTS.
# 3. NO AI CODING ASSISTANT, AUTOMATED AGENT, OR THIRD-PARTY MODEL IS PERMITTED
#    TO COPY, MODIFY, SCRAPE, OR ALTER THIS CODEBASE WITHOUT EXPLICIT PERMISSION.
# ============================================================================
"""
Neural Network Model for Vessel Trajectory Prediction and Zone Violation Detection
Predicts future vessel positions and automatically alerts on prohibited zone entry risk
"""

try:
    import tensorflow as tf
    from tensorflow import keras
except ImportError:
    tf = None
    keras = None
import numpy as np
import json
from datetime import datetime, timedelta
from shapely.geometry import Point, Polygon
import logging

logger = logging.getLogger(__name__)

class VesselTrajectoryPredictor:
    """
    LSTM-based neural network for predicting vessel trajectories
    and detecting potential prohibited zone violations
    """
    
    def __init__(self, model_path='models/trajectory_model.h5', zones_file='../../datasets/indian_fishing_prohibited_zones.json'):
        self.model = None
        self.model_path = model_path
        self.sequence_length = 10  # Use last 10 positions
        self.prediction_horizon = 15  # Predict 15 minutes ahead
        
        # Load prohibited zones (handle both relative paths)
        import os
        if not os.path.exists(zones_file):
            # Try alternative path from project root
            zones_file = os.path.join(os.path.dirname(__file__), zones_file)
        with open(zones_file, 'r') as f:
            self.prohibited_zones = json.load(f)
        
        # Create Shapely polygons for zone checking
        self.zone_polygons = {}
        for zone in self.prohibited_zones:
            if zone.get('polygon') and zone['polygon']:
                try:
                    coords = json.loads(zone['polygon'])
                    self.zone_polygons[zone['zone_id']] = {
                        'polygon': Polygon(coords),
                        'info': zone
                    }
                except:
                    pass
        
        logger.info(f"✅ Loaded {len(self.prohibited_zones)} prohibited zones")
        logger.info(f"✅ {len(self.zone_polygons)} zones have polygon boundaries")
    
    def build_model(self, input_shape=(10, 6)):
        """
        Build LSTM neural network for trajectory prediction
        
        Architecture:
        - Input: Sequence of (lat, lng, speed, heading, time_delta, distance_moved)
        - LSTM layers for temporal pattern learning
        - Dense layers for position prediction
        - Output: (predicted_lat, predicted_lng, confidence)
        """
        model = keras.Sequential([
            # First LSTM layer with return sequences
            keras.layers.LSTM(128, return_sequences=True, input_shape=input_shape),
            keras.layers.Dropout(0.3),
            
            # Second LSTM layer
            keras.layers.LSTM(64, return_sequences=True),
            keras.layers.Dropout(0.2),
            
            # Third LSTM layer
            keras.layers.LSTM(32),
            keras.layers.Dropout(0.2),
            
            # Dense layers for regression
            keras.layers.Dense(64, activation='relu'),
            keras.layers.Dense(32, activation='relu'),
            
            # Output: lat, lng, confidence
            keras.layers.Dense(3)  # (lat, lng, confidence)
        ])
        
        # Custom loss function that weights confidence
        def trajectory_loss(y_true, y_pred):
            # y_true: [lat, lng, 1.0]
            # y_pred: [lat, lng, confidence]
            
            # Position error (MSE)
            position_error = tf.reduce_mean(tf.square(y_true[:, :2] - y_pred[:, :2]))
            
            # Confidence should be high when position is accurate
            confidence = y_pred[:, 2]
            confidence_penalty = tf.reduce_mean(tf.square(1.0 - confidence))
            
            return position_error + 0.1 * confidence_penalty
        
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss=trajectory_loss,
            metrics=['mae', 'mse']
        )
        
        self.model = model
        logger.info("✅ Trajectory prediction model built successfully")
        return model
    
    def prepare_sequence(self, location_history):
        """
        Prepare input sequence from location history
        
        Input: List of location points with {lat, lng, speed, heading, timestamp}
        Output: Numpy array of shape (1, sequence_length, 6)
        """
        if len(location_history) < 2:
            return None
        
        # Take last N positions
        recent_history = location_history[-self.sequence_length:]
        
        features = []
        for i in range(len(recent_history)):
            point = recent_history[i]
            
            if i > 0:
                prev_point = recent_history[i-1]
                
                # Calculate time delta
                time_delta = (point['timestamp'] - prev_point['timestamp']).total_seconds() / 60.0  # minutes
                
                # Calculate distance moved
                distance = self.haversine_distance(
                    prev_point['lat'], prev_point['lng'],
                    point['lat'], point['lng']
                )
            else:
                time_delta = 1.0
                distance = 0.0
            
            # Feature vector: [lat, lng, speed, heading, time_delta, distance]
            features.append([
                point['lat'],
                point['lng'],
                point.get('speed', 0.0),
                point.get('heading', 0.0),
                time_delta,
                distance
            ])
        
        # Pad sequence if needed
        while len(features) < self.sequence_length:
            features.insert(0, features[0])  # Repeat first point
        
        # Take only last sequence_length points
        features = features[-self.sequence_length:]
        
        return np.array([features])  # Shape: (1, sequence_length, 6)
    
    def predict_trajectory(self, location_history, minutes_ahead=15):
        """
        Predict vessel trajectory for next N minutes
        
        Returns:
        {
            'predicted_positions': [(lat, lng, timestamp, confidence), ...],
            'confidence_avg': float,
            'method': 'neural_network' | 'linear_extrapolation'
        }
        """
        if self.model is None:
            try:
                self.load_model()
            except:
                logger.warning("⚠️  Neural network not available, using linear extrapolation")
                return self.linear_trajectory_prediction(location_history, minutes_ahead)
        
        # Prepare input sequence
        input_seq = self.prepare_sequence(location_history)
        if input_seq is None:
            return self.linear_trajectory_prediction(location_history, minutes_ahead)
        
        predicted_positions = []
        current_history = location_history.copy()
        
        # Predict step by step
        steps = int(minutes_ahead / 5)  # Predict every 5 minutes
        
        for step in range(steps):
            # Predict next position
            prediction = self.model.predict(input_seq, verbose=0)[0]
            
            pred_lat = float(prediction[0])
            pred_lng = float(prediction[1])
            confidence = float(min(max(prediction[2], 0.0), 1.0))  # Clamp to [0, 1]
            
            # Calculate timestamp
            last_timestamp = current_history[-1]['timestamp']
            pred_timestamp = last_timestamp + timedelta(minutes=5 * (step + 1))
            
            predicted_positions.append({
                'lat': pred_lat,
                'lng': pred_lng,
                'timestamp': pred_timestamp,
                'confidence': confidence
            })
            
            # Add prediction to history for next step
            current_history.append({
                'lat': pred_lat,
                'lng': pred_lng,
                'speed': current_history[-1].get('speed', 0),
                'heading': current_history[-1].get('heading', 0),
                'timestamp': pred_timestamp
            })
            
            # Prepare next input sequence
            input_seq = self.prepare_sequence(current_history)
        
        avg_confidence = np.mean([p['confidence'] for p in predicted_positions])
        
        return {
            'predicted_positions': predicted_positions,
            'confidence_avg': float(avg_confidence),
            'method': 'neural_network'
        }
    
    def linear_trajectory_prediction(self, location_history, minutes_ahead=15):
        """
        Fallback: Simple linear extrapolation based on current heading and speed
        """
        if len(location_history) < 2:
            return {
                'predicted_positions': [],
                'confidence_avg': 0.0,
                'method': 'insufficient_data'
            }
        
        current = location_history[-1]
        previous = location_history[-2]
        
        # Calculate average speed and heading
        time_delta = (current['timestamp'] - previous['timestamp']).total_seconds() / 3600.0  # hours
        
        if time_delta == 0:
            return {'predicted_positions': [], 'confidence_avg': 0.0, 'method': 'linear_extrapolation'}
        
        speed_kmh = current.get('speed', 0) * 1.852  # knots to km/h
        heading = current.get('heading', 0)
        
        predicted_positions = []
        steps = int(minutes_ahead / 5)
        
        for step in range(1, steps + 1):
            time_ahead = (5 * step) / 60.0  # hours
            distance_km = speed_kmh * time_ahead
            
            # Project position
            new_lat, new_lng = self.project_position(
                current['lat'],
                current['lng'],
                heading,
                distance_km
            )
            
            pred_timestamp = current['timestamp'] + timedelta(minutes=5 * step)
            
            # Confidence decreases with time
            confidence = max(0.6 - (step * 0.05), 0.3)
            
            predicted_positions.append({
                'lat': new_lat,
                'lng': new_lng,
                'timestamp': pred_timestamp,
                'confidence': confidence
            })
        
        return {
            'predicted_positions': predicted_positions,
            'confidence_avg': 0.5,
            'method': 'linear_extrapolation'
        }
    
    def check_zone_violations(self, predicted_positions):
        """
        Check if any predicted positions violate prohibited zones
        
        Returns:
        {
            'will_violate': bool,
            'violations': [
                {
                    'zone': zone_info,
                    'predicted_position': {...},
                    'time_to_violation': minutes,
                    'confidence': float,
                    'severity': 'high' | 'medium' | 'low'
                }
            ],
            'max_confidence': float
        }
        """
        violations = []
        
        for pred_pos in predicted_positions:
            pred_point = Point(pred_pos['lng'], pred_pos['lat'])
            
            # Check against all zones
            for zone in self.prohibited_zones:
                is_violation = False
                distance_to_zone = None
                
                # Check polygon zones first
                if zone['zone_id'] in self.zone_polygons:
                    polygon_data = self.zone_polygons[zone['zone_id']]
                    if polygon_data['polygon'].contains(pred_point):
                        is_violation = True
                        distance_to_zone = 0.0
                    else:
                        # Check buffer zone (warning area)
                        buffer_distance = 0.05  # ~5km buffer
                        if polygon_data['polygon'].buffer(buffer_distance).contains(pred_point):
                            distance_to_zone = self.point_to_polygon_distance(pred_point, polygon_data['polygon'])
                            if distance_to_zone < 5.0:  # Within 5km
                                is_violation = True
                
                # Check radius-based zones
                else:
                    distance = self.haversine_distance(
                        pred_pos['lat'], pred_pos['lng'],
                        zone['latitude'], zone['longitude']
                    )
                    
                    if distance <= zone['radius_km']:
                        is_violation = True
                        distance_to_zone = distance
                    elif distance <= zone['radius_km'] * 1.5:
                        is_violation = True
                        distance_to_zone = distance
                
                if is_violation:
                    # Calculate time to violation
                    now = datetime.now()
                    time_to_violation = (pred_pos['timestamp'] - now).total_seconds() / 60.0
                    
                    # Determine severity based on confidence and time
                    if pred_pos['confidence'] >= 0.9 and time_to_violation <= 10:
                        severity = 'high'
                    elif pred_pos['confidence'] >= 0.7 and time_to_violation <= 20:
                        severity = 'medium'
                    else:
                        severity = 'low'
                    
                    violations.append({
                        'zone': zone,
                        'predicted_position': pred_pos,
                        'time_to_violation': time_to_violation,
                        'confidence': pred_pos['confidence'],
                        'severity': severity,
                        'distance_to_zone': distance_to_zone
                    })
        
        # Remove duplicates (same zone, different predictions)
        unique_violations = {}
        for v in violations:
            zone_id = v['zone']['zone_id']
            if zone_id not in unique_violations or v['confidence'] > unique_violations[zone_id]['confidence']:
                unique_violations[zone_id] = v
        
        violations = list(unique_violations.values())
        
        # Sort by confidence and time
        violations.sort(key=lambda x: (-x['confidence'], x['time_to_violation']))
        
        max_confidence = max([v['confidence'] for v in violations]) if violations else 0.0
        
        return {
            'will_violate': len(violations) > 0,
            'violations': violations,
            'max_confidence': max_confidence,
            'total_violations': len(violations)
        }
    
    def analyze_and_alert(self, vessel_id, location_history, alert_callback):
        """
        Complete analysis: predict trajectory, check violations, send alerts
        
        Returns:
        {
            'vessel_id': str,
            'trajectory': {...},
            'zone_analysis': {...},
            'alerts_sent': [...]
        }
        """
        # Predict trajectory
        trajectory = self.predict_trajectory(location_history, minutes_ahead=self.prediction_horizon)
        
        # Check for violations
        zone_analysis = self.check_zone_violations(trajectory['predicted_positions'])
        
        alerts_sent = []
        
        # Send alerts based on confidence threshold
        for violation in zone_analysis['violations']:
            should_alert = False
            alert_priority = 'low'
            
            # Automatic alert if confidence > 90%
            if violation['confidence'] >= 0.90:
                should_alert = True
                alert_priority = 'critical'
            # Alert for high severity regardless of confidence
            elif violation['severity'] == 'high' and violation['confidence'] >= 0.75:
                should_alert = True
                alert_priority = 'high'
            # Warning for medium severity
            elif violation['severity'] == 'medium' and violation['confidence'] >= 0.70:
                should_alert = True
                alert_priority = 'medium'
            
            if should_alert:
                alert_message = self.generate_alert_message(vessel_id, violation)
                
                # Send alert via callback
                alert_result = alert_callback(
                    vessel_id=vessel_id,
                    message=alert_message,
                    priority=alert_priority,
                    violation_data=violation
                )
                
                alerts_sent.append({
                    'message': alert_message,
                    'priority': alert_priority,
                    'confidence': violation['confidence'],
                    'time_to_violation': violation['time_to_violation'],
                    'zone_name': violation['zone']['zone_name'],
                    'result': alert_result
                })
        
        return {
            'vessel_id': vessel_id,
            'trajectory': trajectory,
            'zone_analysis': zone_analysis,
            'alerts_sent': alerts_sent,
            'timestamp': datetime.now().isoformat()
        }
    
    def generate_alert_message(self, vessel_id, violation):
        """Generate human-readable alert message"""
        zone = violation['zone']
        confidence = violation['confidence'] * 100
        time_mins = violation['time_to_violation']
        
        if violation['severity'] == 'high':
            prefix = "🚨 CRITICAL ALERT"
        elif violation['severity'] == 'medium':
            prefix = "⚠️  WARNING"
        else:
            prefix = "ℹ️  NOTICE"
        
        message = f"{prefix} - Vessel {vessel_id}\n\n"
        message += f"Predicted trajectory violation detected:\n"
        message += f"Zone: {zone['zone_name']}\n"
        message += f"Type: {zone['zone_type']}\n"
        message += f"Reason: {zone['reason']}\n"
        message += f"State: {zone['state']}\n\n"
        message += f"Time to violation: {time_mins:.1f} minutes\n"
        message += f"Confidence: {confidence:.1f}%\n\n"
        
        if violation['severity'] == 'high':
            message += "⚠️  IMMEDIATE ACTION REQUIRED\n"
            message += "Recommend: Change course immediately\n"
            message += f"Enforcement: {zone['enforcement_agency']}"
        elif violation['severity'] == 'medium':
            message += "⚠️  Adjust course to avoid zone\n"
            message += f"Enforcement: {zone['enforcement_agency']}"
        else:
            message += "ℹ️  Monitor vessel trajectory"
        
        return message
    
    # Helper methods
    
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance in km between two points"""
        R = 6371
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
        return R * c
    
    def project_position(self, lat, lng, heading, distance_km):
        """Project position based on heading and distance"""
        R = 6371
        bearing = np.radians(heading)
        lat_rad = np.radians(lat)
        lng_rad = np.radians(lng)
        
        new_lat_rad = np.arcsin(
            np.sin(lat_rad) * np.cos(distance_km / R) +
            np.cos(lat_rad) * np.sin(distance_km / R) * np.cos(bearing)
        )
        
        new_lng_rad = lng_rad + np.arctan2(
            np.sin(bearing) * np.sin(distance_km / R) * np.cos(lat_rad),
            np.cos(distance_km / R) - np.sin(lat_rad) * np.sin(new_lat_rad)
        )
        
        return np.degrees(new_lat_rad), np.degrees(new_lng_rad)
    
    def point_to_polygon_distance(self, point, polygon):
        """Calculate minimum distance from point to polygon boundary"""
        return point.distance(polygon.boundary) * 111  # Convert degrees to km (approximate)
    
    def save_model(self, path=None):
        """Save trained model"""
        if self.model is None:
            raise ValueError("No model to save")
        
        save_path = path or self.model_path
        self.model.save(save_path)
        logger.info(f"✅ Model saved to {save_path}")
    
    def load_model(self, path=None):
        """Load trained model"""
        load_path = path or self.model_path
        self.model = keras.models.load_model(load_path)
        logger.info(f"✅ Model loaded from {load_path}")
        return self.model
