import { normalizeGeographicKey } from '@/lib/normalizeGeographicKey';

interface DistrictData {
  district: string;
  state: string;
  screened: number;
  diagnosed: number;
  breachCount: number;
  breachRate: number;
}

interface VectorPrediction {
  sourceName: string;
  targetName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  transmissionProbability: number;
  reasoning: string;
}

export interface VectorArc {
  source: [number, number]; // [lng, lat]
  target: [number, number]; // [lng, lat]
  volume: number; // 0-100 scale for visualization
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  sourceName: string;
  targetName: string;
  reasoning: string;
}

/**
 * Fetch vector arcs from Gemini-powered prediction engine
 */
export async function fetchVectorArcs(
  districtData: DistrictData[],
  geoData: any
): Promise<VectorArc[]> {
  try {
    console.log('🦠 Fetching vector predictions from Gemini...');

    const response = await fetch('/api/vector-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ districtData }),
    });

    if (!response.ok) {
      throw new Error(`Vector Engine API failed: ${response.statusText}`);
    }

    const { vectors } = await response.json() as { vectors: VectorPrediction[] };

    // Map predictions to geographic coordinates
    const arcs: VectorArc[] = [];

    for (const prediction of vectors) {
      const sourceKey = normalizeGeographicKey(prediction.sourceName);
      const targetKey = normalizeGeographicKey(prediction.targetName);

      // Find source coordinates
      const sourceFeature = geoData?.features?.find((f: any) =>
        normalizeGeographicKey(f.properties.district || '') === sourceKey
      );

      // Find target coordinates
      const targetFeature = geoData?.features?.find((f: any) =>
        normalizeGeographicKey(f.properties.district || '') === targetKey
      );

      if (sourceFeature && targetFeature) {
        const sourceCoords = getCentroid(sourceFeature.geometry.coordinates);
        const targetCoords = getCentroid(targetFeature.geometry.coordinates);

        if (sourceCoords && targetCoords) {
          arcs.push({
            source: sourceCoords,
            target: targetCoords,
            volume: Math.round(prediction.transmissionProbability * 100),
            riskLevel: prediction.riskLevel,
            sourceName: prediction.sourceName,
            targetName: prediction.targetName,
            reasoning: prediction.reasoning,
          });
        }
      }
    }

    console.log(`🦠 Generated ${arcs.length} vector arcs from ${vectors.length} predictions`);
    return arcs;

  } catch (error) {
    console.error('Failed to fetch vector arcs:', error);
    return [];
  }
}

/**
 * Calculate centroid of a polygon or multipolygon
 */
function getCentroid(coordinates: any): [number, number] | null {
  try {
    let allPoints: number[][] = [];

    // Handle Polygon
    if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]) && typeof coordinates[0][0][0] === 'number') {
      allPoints = coordinates[0];
    }
    // Handle MultiPolygon
    else if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0]) && Array.isArray(coordinates[0][0][0])) {
      allPoints = coordinates[0][0];
    }

    if (allPoints.length === 0) return null;

    const sum = allPoints.reduce(
      (acc, point) => {
        acc[0] += point[0];
        acc[1] += point[1];
        return acc;
      },
      [0, 0]
    );

    return [sum[0] / allPoints.length, sum[1] / allPoints.length];
  } catch (error) {
    console.error('Centroid calculation error:', error);
    return null;
  }
}
