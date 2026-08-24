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
# 
# NOTICE & RESTRICTIONS:
# 1. COMMERCIAL USE, DUPLICATION, OR RE-DISTRIBUTION IS STRICTLY PROHIBITED.
# 2. ONLY THE AUTHORIZED OWNER HOLDS ALL INTELLECTUAL PROPERTY & USAGE RIGHTS.
# 3. NO AI CODING ASSISTANT, AUTOMATED AGENT, OR THIRD-PARTY MODEL IS PERMITTED
#    TO COPY, MODIFY, SCRAPE, OR ALTER THIS CODEBASE WITHOUT EXPLICIT PERMISSION.
# ============================================================================
"""
Training Script for Vessel Trajectory Prediction Neural Network
Trains LSTM model on historical vessel movement data
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from trajectory_predictor import VesselTrajectoryPredictor
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrajectoryTrainer:
    """
    Generates synthetic training data and trains trajectory prediction model
    In production, replace with real historical data from Firebase
    """
    
    def __init__(self):
        self.predictor = VesselTrajectoryPredictor()
        self.sequence_length = 10
        self.prediction_horizon = 3  # Predict 3 steps ahead (15 minutes)
    
    def generate_synthetic_training_data(self, num_trajectories=1000):
        """
        Generate synthetic vessel trajectories for training
        
        Patterns:
        1. Straight line movement
        2. Circular patterns (fishing)
        3. Zigzag patterns (trawling)
        4. Random walk
        """
        X_train = []
        y_train = []
        
        logger.info(f"🔄 Generating {num_trajectories} synthetic trajectories...")
        
        for i in range(num_trajectories):
            trajectory_type = np.random.choice(['straight', 'circular', 'zigzag', 'random'], 
                                                p=[0.4, 0.3, 0.2, 0.1])
            
            # Generate trajectory
            trajectory = self.generate_trajectory(trajectory_type, length=30)
            
            # Create training sequences
            for j in range(len(trajectory) - self.sequence_length - self.prediction_horizon):
                # Input: sequence of positions
                input_seq = trajectory[j:j+self.sequence_length]
                
                # Output: future position (3 steps ahead = 15 minutes)
                future_pos = trajectory[j+self.sequence_length+self.prediction_horizon-1]
                
                # Prepare features
                features = []
                for k in range(len(input_seq)):
                    point = input_seq[k]
                    
                    if k > 0:
                        prev = input_seq[k-1]
                        time_delta = (point['timestamp'] - prev['timestamp']).total_seconds() / 60.0
                        distance = self.haversine_distance(
                            prev['lat'], prev['lng'],
                            point['lat'], point['lng']
                        )
                    else:
                        time_delta = 1.0
                        distance = 0.0
                    
                    features.append([
                        point['lat'],
                        point['lng'],
                        point['speed'],
                        point['heading'],
                        time_delta,
                        distance
                    ])
                
                X_train.append(features)
                y_train.append([future_pos['lat'], future_pos['lng'], 1.0])  # confidence=1.0 for training
            
            if (i + 1) % 100 == 0:
                logger.info(f"   Generated {i+1}/{num_trajectories} trajectories")
        
        X_train = np.array(X_train)
        y_train = np.array(y_train)
        
        logger.info(f"✅ Training data shape: X={X_train.shape}, y={y_train.shape}")
        
        return X_train, y_train
    
    def generate_trajectory(self, trajectory_type, length=30):
        """Generate single vessel trajectory"""
        # Random starting position (Indian coastal waters)
        start_lat = np.random.uniform(8.0, 22.0)  # Latitude range of India
        start_lng = np.random.uniform(68.0, 88.0)  # Longitude range of India
        
        trajectory = []
        current_lat = start_lat
        current_lng = start_lng
        current_heading = np.random.uniform(0, 360)
        current_speed = np.random.uniform(3, 12)  # knots
        timestamp = datetime.now()
        
        for i in range(length):
            trajectory.append({
                'lat': current_lat,
                'lng': current_lng,
                'speed': current_speed,
                'heading': current_heading,
                'timestamp': timestamp
            })
            
            # Update position based on trajectory type
            if trajectory_type == 'straight':
                # Maintain heading with small variations
                current_heading += np.random.uniform(-5, 5)
                current_speed += np.random.uniform(-0.5, 0.5)
            
            elif trajectory_type == 'circular':
                # Fishing pattern - circular movement
                current_heading += np.random.uniform(10, 20)
                current_speed = np.random.uniform(2, 5)  # Slower speed
            
            elif trajectory_type == 'zigzag':
                # Trawling pattern
                if i % 5 == 0:
                    current_heading += np.random.choice([-45, 45])
                current_speed = np.random.uniform(4, 8)
            
            else:  # random
                current_heading += np.random.uniform(-30, 30)
                current_speed += np.random.uniform(-2, 2)
            
            # Clamp values
            current_heading = current_heading % 360
            current_speed = max(1, min(15, current_speed))
            
            # Calculate new position
            distance_km = (current_speed * 1.852) * (5/60)  # 5 minutes at current speed
            new_lat, new_lng = self.project_position(current_lat, current_lng, current_heading, distance_km)
            
            current_lat = new_lat
            current_lng = new_lng
            timestamp += timedelta(minutes=5)
        
        return trajectory
    
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        R = 6371
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
        return R * c
    
    def project_position(self, lat, lng, heading, distance_km):
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
    
    def train_model(self, X_train, y_train, epochs=50, batch_size=32, validation_split=0.2):
        """Train the neural network"""
        logger.info("🔄 Building model architecture...")
        self.predictor.build_model(input_shape=(self.sequence_length, 6))
        
        logger.info(f"🔄 Training model for {epochs} epochs...")
        logger.info(f"   Training samples: {len(X_train)}")
        logger.info(f"   Validation split: {validation_split}")
        
        # Callbacks
        from tensorflow import keras
        
        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True,
                verbose=1
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=5,
                min_lr=0.00001,
                verbose=1
            ),
            keras.callbacks.ModelCheckpoint(
                filepath='models/trajectory_model_best.h5',
                monitor='val_loss',
                save_best_only=True,
                verbose=1
            )
        ]
        
        # Train
        history = self.predictor.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            callbacks=callbacks,
            verbose=1
        )
        
        # Evaluate
        logger.info("\n✅ Training completed!")
        logger.info(f"   Final training loss: {history.history['loss'][-1]:.4f}")
        logger.info(f"   Final validation loss: {history.history['val_loss'][-1]:.4f}")
        
        return history
    
    def test_model(self, num_tests=10):
        """Test model predictions"""
        logger.info(f"\n🔄 Testing model with {num_tests} random trajectories...")
        
        test_results = []
        
        for i in range(num_tests):
            # Generate test trajectory
            trajectory = self.generate_trajectory('straight', length=30)
            
            # Use first 10 points to predict
            history = trajectory[:10]
            actual_future = trajectory[13]  # 15 minutes ahead
            
            # Predict
            prediction = self.predictor.predict_trajectory(history, minutes_ahead=15)
            
            if prediction['predicted_positions']:
                predicted = prediction['predicted_positions'][-1]
                
                # Calculate error
                error = self.haversine_distance(
                    actual_future['lat'], actual_future['lng'],
                    predicted['lat'], predicted['lng']
                )
                
                test_results.append({
                    'error_km': error,
                    'confidence': predicted['confidence'],
                    'method': prediction['method']
                })
                
                logger.info(f"   Test {i+1}: Error={error:.2f}km, Confidence={predicted['confidence']:.2%}")
        
        avg_error = np.mean([r['error_km'] for r in test_results])
        avg_confidence = np.mean([r['confidence'] for r in test_results])
        
        logger.info(f"\n✅ Test Results:")
        logger.info(f"   Average prediction error: {avg_error:.2f} km")
        logger.info(f"   Average confidence: {avg_confidence:.2%}")
        
        return test_results
    
    def save_training_info(self, history, test_results):
        """Save training metadata"""
        info = {
            'trained_at': datetime.now().isoformat(),
            'model_architecture': 'LSTM (128->64->32)',
            'sequence_length': self.sequence_length,
            'prediction_horizon_minutes': self.prediction_horizon * 5,
            'training_epochs': len(history.history['loss']),
            'final_training_loss': float(history.history['loss'][-1]),
            'final_validation_loss': float(history.history['val_loss'][-1]),
            'test_avg_error_km': float(np.mean([r['error_km'] for r in test_results])),
            'test_avg_confidence': float(np.mean([r['confidence'] for r in test_results]))
        }
        
        with open('models/trajectory_model_info.json', 'w') as f:
            json.dump(info, f, indent=2)
        
        logger.info("\n✅ Training info saved to models/trajectory_model_info.json")

def main():
    """Main training pipeline"""
    logger.info("="*70)
    logger.info("🚢 VESSEL TRAJECTORY PREDICTION MODEL - TRAINING PIPELINE")
    logger.info("="*70)
    
    # Create models directory
    os.makedirs('models', exist_ok=True)
    
    trainer = TrajectoryTrainer()
    
    # Generate training data
    X_train, y_train = trainer.generate_synthetic_training_data(num_trajectories=1000)
    
    # Train model
    history = trainer.train_model(X_train, y_train, epochs=50, batch_size=32)
    
    # Save model
    trainer.predictor.save_model('models/trajectory_model.h5')
    
    # Test model
    test_results = trainer.test_model(num_tests=20)
    
    # Save training info
    trainer.save_training_info(history, test_results)
    
    logger.info("\n" + "="*70)
    logger.info("✅ TRAINING COMPLETE - Model ready for deployment!")
    logger.info("="*70)
    logger.info("\nNext steps:")
    logger.info("1. Start Flask API: python backend/app.py")
    logger.info("2. Test predictions: POST /api/ml/predict-trajectory")
    logger.info("3. Monitor alerts in real-time")

if __name__ == '__main__':
    main()
