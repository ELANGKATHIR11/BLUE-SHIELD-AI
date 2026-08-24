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
Real Prohibited Zone Detection with Shapely Polygon Support
Integrates with 159 Indian fishing prohibited zones dataset
"""

import json
import os
from shapely.geometry import Point, Polygon
import numpy as np
from typing import Dict, List, Tuple, Optional

class ZoneDetector:
    def __init__(self, zones_file='../datasets/indian_fishing_prohibited_zones.json'):
        """Initialize zone detector with prohibited zones data"""
        # Load zones from JSON file
        zones_path = os.path.join(os.path.dirname(__file__), zones_file)
        if not os.path.exists(zones_path):
            zones_path = os.path.join(os.path.dirname(__file__), '../../datasets/indian_fishing_prohibited_zones.json')
        
        with open(zones_path, 'r') as f:
            self.zones = json.load(f)
        
        # Create Shapely polygons for complex zones
        self.zone_polygons = {}
        for zone in self.zones:
            zone_key = zone.get('zone_id') or zone.get('id')
            if zone.get('polygon') and zone_key:
                # Polygon coordinates in format [[lng, lat], ...]
                coords = [(p[1], p[0]) for p in zone['polygon']]  # Swap to (lat, lng)
                self.zone_polygons[zone_key] = Polygon(coords)
        
        print(f"✅ Loaded {len(self.zones)} prohibited zones")
        print(f"   📐 {len(self.zone_polygons)} zones with polygon boundaries")
    
    def check_zone_violation(self, lat: float, lng: float) -> Dict:
        """Check if vessel is in prohibited zone"""
        vessel_point = Point(lat, lng)  # Shapely Point (lat, lng)
        
        violations = []
        warnings = []
        
        for zone in self.zones:
            zone_id = zone['zone_id']
            
            # Check polygon-based zones first (most accurate)
            if zone_id in self.zone_polygons:
                polygon = self.zone_polygons[zone_id]
                if polygon.contains(vessel_point):
                    violations.append({
                        'zone_id': zone_id,
                        'zone_name': zone['name'],
                        'zone_type': zone.get('zone_type', 'prohibited'),
                        'enforcement_agency': zone.get('enforcement_agency', 'Unknown'),
                        'penalty': zone.get('penalty', 'Legal action'),
                        'distance': 0,  # Inside zone
                        'severity': 'critical'
                    })
                    continue
            
            # Fallback to radius-based detection
            if zone.get('radius_km'):
                distance = self.haversine_distance(
                    lat, lng,
                    zone['latitude'], zone['longitude']
                )
                
                # Inside prohibited zone
                if distance <= zone['radius_km']:
                    violations.append({
                        'zone_id': zone_id,
                        'zone_name': zone['name'],
                        'zone_type': zone.get('zone_type', 'prohibited'),
                        'enforcement_agency': zone.get('enforcement_agency', 'Unknown'),
                        'penalty': zone.get('penalty', 'Legal action'),
                        'distance': distance,
                        'severity': 'critical'
                    })
                # Near zone (within 5km buffer)
                elif distance <= zone['radius_km'] + 5:
                    warnings.append({
                        'zone_id': zone_id,
                        'zone_name': zone['name'],
                        'distance_to_zone': distance - zone['radius_km'],
                        'severity': 'warning'
                    })
        
        return {
            'violations': violations,
            'warnings': warnings,
            'isViolating': len(violations) > 0,
            'isNearZone': len(warnings) > 0
        }
    
    def predict_trajectory_violation(
        self, 
        lat: float, 
        lng: float, 
        heading: float, 
        speed_knots: float,
        time_horizon_minutes: int = 15
    ) -> Dict:
        """Predict if vessel will enter prohibited zone based on current trajectory"""
        # Convert speed to km/h
        speed_kmh = speed_knots * 1.852
        
        # Project position ahead
        time_delta = time_horizon_minutes / 60  # hours
        distance_km = speed_kmh * time_delta
        
        # Calculate new position based on heading
        new_lat, new_lng = self.project_position(lat, lng, heading, distance_km)
        
        # Check if projected position violates zones
        future_check = self.check_zone_violation(new_lat, new_lng)
        
        if future_check['violations']:
            # Calculate actual time to violation (more accurate)
            target_zone = future_check['violations'][0]
            time_to_violation = self.calculate_time_to_zone(
                lat, lng, heading, speed_kmh,
                target_zone['zone_id']
            )
            
            return {
                'willViolate': True,
                'timeToViolation': time_to_violation,  # minutes
                'targetZone': target_zone,
                'projectedPosition': {
                    'lat': new_lat,
                    'lng': new_lng,
                    'timeAhead': time_horizon_minutes
                },
                'severity': 'high',
                'confidence': self.calculate_trajectory_confidence(speed_kmh, heading)
            }
        
        return {'willViolate': False, 'confidence': 0.0}
    
    def calculate_time_to_zone(
        self, 
        lat: float, 
        lng: float, 
        heading: float, 
        speed_kmh: float,
        zone_id: str
    ) -> Optional[float]:
        """Calculate estimated time (in minutes) until vessel enters zone"""
        zone = next((z for z in self.zones if z['zone_id'] == zone_id), None)
        if not zone:
            return None
        
        # Distance to zone center
        distance_km = self.haversine_distance(lat, lng, zone['latitude'], zone['longitude'])
        
        # Subtract zone radius
        distance_to_boundary = distance_km - zone.get('radius_km', 0)
        
        if distance_to_boundary <= 0 or speed_kmh == 0:
            return 0  # Already inside or not moving
        
        # Time = distance / speed (in hours) * 60 (to minutes)
        time_hours = distance_to_boundary / speed_kmh
        return time_hours * 60
    
    def calculate_trajectory_confidence(self, speed_kmh: float, heading: float) -> float:
        """Calculate confidence score for trajectory prediction (0-1)"""
        # Higher speed = more reliable trajectory prediction
        speed_confidence = min(speed_kmh / 30.0, 1.0)  # Max confidence at 30 km/h
        
        # Valid heading check
        heading_confidence = 1.0 if 0 <= heading <= 360 else 0.5
        
        # Combined confidence
        return (speed_confidence + heading_confidence) / 2
    
    def project_position(
        self, 
        lat: float, 
        lng: float, 
        heading: float, 
        distance_km: float
    ) -> Tuple[float, float]:
        """Project position based on heading and distance (Great Circle calculation)"""
        R = 6371  # Earth radius in km
        
        bearing = np.radians(heading)
        lat_rad = np.radians(lat)
        lng_rad = np.radians(lng)
        
        # Haversine formula for new position
        new_lat_rad = np.arcsin(
            np.sin(lat_rad) * np.cos(distance_km / R) +
            np.cos(lat_rad) * np.sin(distance_km / R) * np.cos(bearing)
        )
        
        new_lng_rad = lng_rad + np.arctan2(
            np.sin(bearing) * np.sin(distance_km / R) * np.cos(lat_rad),
            np.cos(distance_km / R) - np.sin(lat_rad) * np.sin(new_lat_rad)
        )
        
        return np.degrees(new_lat_rad), np.degrees(new_lng_rad)
    
    def haversine_distance(
        self, 
        lat1: float, 
        lon1: float, 
        lat2: float, 
        lon2: float
    ) -> float:
        """Calculate distance between two points in km"""
        R = 6371  # Earth radius in km
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = (np.sin(dlat/2)**2 + 
             np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2)
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
        return R * c
    
    def get_zone_by_id(self, zone_id: str) -> Optional[Dict]:
        """Get zone details by ID"""
        return next((z for z in self.zones if z['zone_id'] == zone_id), None)
    
    def get_all_zones(self) -> List[Dict]:
        """Get all prohibited zones"""
        return self.zones
    
    def get_zones_in_area(
        self, 
        center_lat: float, 
        center_lng: float, 
        radius_km: float
    ) -> List[Dict]:
        """Get all zones within specified radius of a point"""
        nearby_zones = []
        
        for zone in self.zones:
            distance = self.haversine_distance(
                center_lat, center_lng,
                zone['latitude'], zone['longitude']
            )
            
            if distance <= radius_km:
                nearby_zones.append({
                    **zone,
                    'distance_from_center': distance
                })
        
        return sorted(nearby_zones, key=lambda x: x['distance_from_center'])
