/**
 * Palk Strait — India–Sri Lanka International Maritime Boundary Line (IMBL)
 * 
 * This GeoJSON polygon defines the forbidden zone on the Sri Lankan side
 * of the maritime boundary in the Palk Strait region. Coordinates are
 * approximate representations of the IMBL based on published maritime
 * boundary data (WGS84 coordinate system).
 * 
 * The boundary runs roughly from the northernmost point near Adam's Bridge
 * (Rameswaram–Talaimannar) up through the Palk Strait to near Point Pedro.
 * 
 * Tamil Nadu fishing boats must NOT cross into this polygon.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MaritimeBoundary {
  name: string;
  description: string;
  type: 'forbidden' | 'warning' | 'safe';
  polygon: GeoPoint[];
  /** Warning buffer distance in meters from the boundary line */
  warningBufferMeters: number;
}

/**
 * The IMBL boundary line itself (Indian side → Sri Lankan side).
 * Points ordered from south (Adam's Bridge) to north (Palk Bay).
 * These are the key turn-points of the maritime boundary.
 */
export const IMBL_LINE: GeoPoint[] = [
  // Southern end — near Adam's Bridge / Dhanushkodi
  { lat: 9.0800, lng: 79.4500 },
  // Moving north through Palk Strait
  { lat: 9.2000, lng: 79.5200 },
  { lat: 9.3500, lng: 79.5800 },
  { lat: 9.4500, lng: 79.6200 },
  { lat: 9.5500, lng: 79.6500 },
  { lat: 9.6500, lng: 79.7000 },
  { lat: 9.7500, lng: 79.7500 },
  // Northern end — near Point Pedro / Kodiyakarai
  { lat: 9.9000, lng: 79.8200 },
  { lat: 10.0500, lng: 79.8800 },
];

/**
 * Sri Lankan Forbidden Zone — the area BEYOND the IMBL on the Sri Lankan side.
 * This is a closed polygon representing the waters where Indian fishing
 * vessels are prohibited from entering.
 */
export const FORBIDDEN_ZONE: MaritimeBoundary = {
  name: 'Sri Lankan Maritime Zone (IMBL)',
  description: 'International Maritime Boundary Line — Indian fishing vessels prohibited beyond this line',
  type: 'forbidden',
  warningBufferMeters: 3000, // 3 km warning buffer before boundary
  polygon: [
    // === IMBL LINE (Indian boundary edge) — south to north ===
    { lat: 9.0800, lng: 79.4500 },
    { lat: 9.2000, lng: 79.5200 },
    { lat: 9.3500, lng: 79.5800 },
    { lat: 9.4500, lng: 79.6200 },
    { lat: 9.5500, lng: 79.6500 },
    { lat: 9.6500, lng: 79.7000 },
    { lat: 9.7500, lng: 79.7500 },
    { lat: 9.9000, lng: 79.8200 },
    { lat: 10.0500, lng: 79.8800 },

    // === SRI LANKAN COAST SIDE (closing the polygon) — north to south ===
    { lat: 10.0500, lng: 80.2000 },
    { lat: 9.9000, lng: 80.1500 },
    { lat: 9.7500, lng: 80.0800 },
    { lat: 9.6500, lng: 80.0200 },
    { lat: 9.5000, lng: 79.9500 },
    { lat: 9.3500, lng: 79.9000 },
    { lat: 9.2000, lng: 79.8500 },
    { lat: 9.0800, lng: 79.8000 },

    // Close polygon back to start
    { lat: 9.0800, lng: 79.4500 },
  ]
};

/**
 * Warning zone — a buffer zone on the Indian side of the IMBL.
 * Vessels entering this zone receive advisory alerts.
 */
export const WARNING_ZONE: MaritimeBoundary = {
  name: 'IMBL Warning Buffer Zone',
  description: 'Approaching International Maritime Boundary — exercise caution',
  type: 'warning',
  warningBufferMeters: 5000, // 5 km early warning
  polygon: [
    // Buffer zone on the Indian side, approximately 3 km from IMBL
    // (offset towards Indian coast from the IMBL line)
    { lat: 9.0800, lng: 79.4200 },
    { lat: 9.2000, lng: 79.4900 },
    { lat: 9.3500, lng: 79.5500 },
    { lat: 9.4500, lng: 79.5900 },
    { lat: 9.5500, lng: 79.6200 },
    { lat: 9.6500, lng: 79.6700 },
    { lat: 9.7500, lng: 79.7200 },
    { lat: 9.9000, lng: 79.7900 },
    { lat: 10.0500, lng: 79.8500 },

    // Now trace the IMBL line back south
    { lat: 10.0500, lng: 79.8800 },
    { lat: 9.9000, lng: 79.8200 },
    { lat: 9.7500, lng: 79.7500 },
    { lat: 9.6500, lng: 79.7000 },
    { lat: 9.5500, lng: 79.6500 },
    { lat: 9.4500, lng: 79.6200 },
    { lat: 9.3500, lng: 79.5800 },
    { lat: 9.2000, lng: 79.5200 },
    { lat: 9.0800, lng: 79.4500 },

    // Close polygon
    { lat: 9.0800, lng: 79.4200 },
  ]
};

/**
 * Map configuration for the Palk Strait region
 */
export const PALK_STRAIT_CONFIG = {
  center: { lat: 9.5000, lng: 79.6500 } as GeoPoint,
  zoom: 9,
  minZoom: 7,
  maxZoom: 15,
  /** Bounding box for the operational area */
  bounds: {
    south: 8.8,
    north: 10.3,
    west: 78.8,
    east: 80.5,
  }
};

/**
 * Key landmarks for reference on the map
 */
export const LANDMARKS = [
  { name: 'Rameswaram', lat: 9.2885, lng: 79.3129, country: 'India' },
  { name: 'Dhanushkodi', lat: 9.1715, lng: 79.4295, country: 'India' },
  { name: 'Kodiyakarai (Point Calimere)', lat: 10.2936, lng: 79.8642, country: 'India' },
  { name: 'Nagapattinam', lat: 10.7660, lng: 79.8424, country: 'India' },
  { name: 'Jaffna', lat: 9.6615, lng: 80.0255, country: 'Sri Lanka' },
  { name: 'Point Pedro', lat: 9.8310, lng: 80.2340, country: 'Sri Lanka' },
  { name: 'Talaimannar', lat: 9.0980, lng: 79.7160, country: 'Sri Lanka' },
  { name: 'Karainagar', lat: 9.7310, lng: 79.9200, country: 'Sri Lanka' },
];
