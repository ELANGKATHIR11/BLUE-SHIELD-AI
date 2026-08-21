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
Data Collector for ML Training
Collects vessel location history from Firebase for training ML models
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VesselDataCollector:
    def __init__(self):
        """Initialize data collector"""
        logger.info("VesselDataCollector initialized")
        # Note: Firebase Admin SDK should be initialized separately in Node.js backend
        # This collector will work with exported data or API endpoints
        
    def generate_synthetic_training_data(self, num_samples=1000):
        """
        Generate synthetic training data for initial model training
        Enhanced with more danger scenarios and balanced class distribution
        In production, replace with real data from Firebase
        """
        logger.info(f"Generating {num_samples} synthetic training samples...")
        
        data = []
        
        # Increased danger scenarios from 10% to 25% for better training
        # Adjusted distribution: 50% safe, 25% warning, 25% danger
        for i in range(num_samples):
            # Random vessel behavior patterns with balanced distribution
            behavior_type = np.random.choice(['normal', 'suspicious', 'dangerous'], p=[0.50, 0.25, 0.25])
            
            # Base parameters
            lat = np.random.uniform(8.0, 20.0)  # Indian waters latitude range
            lng = np.random.uniform(68.0, 92.0)  # Indian waters longitude range
            
            if behavior_type == 'normal':
                # Normal fishing patterns
                speed = np.random.uniform(3, 12)  # Normal fishing speed
                speed_change = np.random.uniform(-1, 1.5)
                heading_change = np.random.uniform(-8, 8)
                distance_moved = speed * np.random.uniform(0.9, 1.1)
                time_delta = np.random.uniform(120, 600)  # Longer stable periods
                hour_of_day = np.random.choice([6,7,8,9,10,11,12,13,14,15,16,17,18])  # Daytime fishing
                risk_label = 0  # Safe
                
            elif behavior_type == 'suspicious':
                # Suspicious patterns - higher speed or erratic movement
                pattern = np.random.choice(['high_speed', 'erratic', 'late_night'])
                
                if pattern == 'high_speed':
                    speed = np.random.uniform(15, 22)  # Higher speed
                    speed_change = np.random.uniform(-3, 4)
                    heading_change = np.random.uniform(-20, 20)
                    hour_of_day = np.random.randint(0, 24)
                elif pattern == 'erratic':
                    speed = np.random.uniform(8, 18)
                    speed_change = np.random.uniform(-5, 5)  # Rapid speed changes
                    heading_change = np.random.uniform(-45, 45)  # Erratic turns
                    hour_of_day = np.random.randint(0, 24)
                else:  # late_night
                    speed = np.random.uniform(10, 18)
                    speed_change = np.random.uniform(-3, 3)
                    heading_change = np.random.uniform(-25, 25)
                    hour_of_day = np.random.choice([22,23,0,1,2,3])  # Late night activity
                
                distance_moved = speed * np.random.uniform(0.8, 1.3)
                time_delta = np.random.uniform(60, 400)
                risk_label = 1  # Warning
                
            else:  # dangerous - Enhanced danger scenarios
                # Multiple danger patterns for better model learning
                danger_pattern = np.random.choice([
                    'extreme_speed', 'rapid_direction_change', 'night_racing',
                    'prohibited_zone_approach', 'suspicious_loitering', 'chase_pattern'
                ])
                
                if danger_pattern == 'extreme_speed':
                    # Very high speed vessels (smuggling, illegal activities)
                    speed = np.random.uniform(25, 40)  # Dangerously high speed
                    speed_change = np.random.uniform(5, 12)  # Sudden acceleration
                    heading_change = np.random.uniform(-30, 30)
                    distance_moved = speed * np.random.uniform(1.1, 1.4)
                    time_delta = np.random.uniform(30, 180)  # Short bursts
                    hour_of_day = np.random.randint(0, 24)
                    
                elif danger_pattern == 'rapid_direction_change':
                    # Evasive maneuvers
                    speed = np.random.uniform(18, 28)
                    speed_change = np.random.uniform(-8, 8)  # Erratic speed
                    heading_change = np.random.uniform(60, 120)  # Sharp turns
                    distance_moved = speed * np.random.uniform(0.7, 1.2)
                    time_delta = np.random.uniform(30, 200)
                    hour_of_day = np.random.randint(0, 24)
                    
                elif danger_pattern == 'night_racing':
                    # High speed at night (smuggling indicator)
                    speed = np.random.uniform(22, 35)
                    speed_change = np.random.uniform(3, 10)
                    heading_change = np.random.uniform(-25, 25)
                    distance_moved = speed * np.random.uniform(1.0, 1.3)
                    time_delta = np.random.uniform(40, 250)
                    hour_of_day = np.random.choice([21,22,23,0,1,2,3,4])  # Night hours
                    
                elif danger_pattern == 'prohibited_zone_approach':
                    # Fast approach to restricted areas
                    speed = np.random.uniform(20, 32)
                    speed_change = np.random.uniform(4, 9)
                    heading_change = np.random.uniform(-20, 20)  # Direct course
                    distance_moved = speed * np.random.uniform(1.1, 1.4)
                    time_delta = np.random.uniform(60, 300)
                    hour_of_day = np.random.randint(0, 24)
                    
                elif danger_pattern == 'suspicious_loitering':
                    # Slow movement with frequent direction changes (potential illegal transfer)
                    speed = np.random.uniform(1, 5)  # Very slow
                    speed_change = np.random.uniform(-3, 3)
                    heading_change = np.random.uniform(45, 90)  # Circling behavior
                    distance_moved = speed * np.random.uniform(0.5, 1.5)
                    time_delta = np.random.uniform(300, 900)  # Long periods
                    hour_of_day = np.random.choice([0,1,2,3,22,23])  # Night loitering
                    
                else:  # chase_pattern
                    # Aggressive pursuit behavior
                    speed = np.random.uniform(28, 38)
                    speed_change = np.random.uniform(6, 12)  # Rapid acceleration
                    heading_change = np.random.uniform(-40, 40)  # Tracking maneuvers
                    distance_moved = speed * np.random.uniform(1.2, 1.5)
                    time_delta = np.random.uniform(30, 150)
                    hour_of_day = np.random.randint(0, 24)
                
                risk_label = 2  # Danger
            
            # Day of week (uniform distribution)
            day_of_week = np.random.randint(0, 7)
            
            data.append({
                'lat': lat,
                'lng': lng,
                'speed': speed,
                'heading': np.random.uniform(0, 360),
                'speed_change': speed_change,
                'heading_change': heading_change,
                'distance_moved': distance_moved,
                'time_delta': time_delta,
                'hour_of_day': hour_of_day,
                'day_of_week': day_of_week,
                'risk_label': risk_label
            })
        
        df = pd.DataFrame(data)
        logger.info(f"✅ Generated {len(df)} synthetic training samples")
        logger.info(f"   Risk distribution: {df['risk_label'].value_counts().to_dict()}")
        
        # Calculate and log distribution percentages
        for label in [0, 1, 2]:
            count = (df['risk_label'] == label).sum()
            percentage = (count / len(df)) * 100
            class_name = ['Safe', 'Warning', 'Danger'][label]
            logger.info(f"      {class_name}: {count} ({percentage:.1f}%)")
        
        return df
    
    def extract_features(self, current, next_point):
        """Extract ML features from vessel movement"""
        # Calculate time delta
        if isinstance(current['timestamp'], str):
            current_time = datetime.fromisoformat(current['timestamp'])
            next_time = datetime.fromisoformat(next_point['timestamp'])
        else:
            current_time = current['timestamp']
            next_time = next_point['timestamp']
        
        time_delta = (next_time - current_time).total_seconds()
        
        # Calculate derived features
        speed_change = abs(next_point.get('speed', 0) - current.get('speed', 0))
        heading_change = abs(next_point.get('heading', 0) - current.get('heading', 0))
        
        # Haversine distance
        distance = self.haversine_distance(
            current['lat'], current['lng'],
            next_point['lat'], next_point['lng']
        )
        
        # Temporal features
        hour_of_day = current_time.hour
        day_of_week = current_time.weekday()
        
        return {
            'speed': current.get('speed', 0),
            'heading': current.get('heading', 0),
            'speed_change': speed_change,
            'heading_change': heading_change,
            'distance_moved': distance,
            'time_delta': time_delta,
            'hour_of_day': hour_of_day,
            'day_of_week': day_of_week,
            'risk_label': 0  # To be manually labeled or rule-based
        }
    
    def haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points in km"""
        R = 6371  # Earth radius in km
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = (np.sin(dlat/2)**2 + 
             np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2)
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
        return R * c
    
    def save_training_data(self, df, filename='training_data.csv'):
        """Save training data to CSV"""
        df.to_csv(filename, index=False)
        logger.info(f"✅ Saved training data to {filename}")
    
    def load_training_data(self, filename='training_data.csv'):
        """Load training data from CSV"""
        df = pd.read_csv(filename)
        logger.info(f"✅ Loaded {len(df)} training samples from {filename}")
        return df


if __name__ == '__main__':
    # Test data collection
    collector = VesselDataCollector()
    df = collector.generate_synthetic_training_data(num_samples=1000)
    collector.save_training_data(df, 'training_data.csv')
    print("\n📊 Training Data Sample:")
    print(df.head())
    print("\n📊 Training Data Statistics:")
    print(df.describe())
