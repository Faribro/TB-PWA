import { useState, useEffect } from 'react';

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    district?: string;
    state?: string;
    [key: string]: any;
  };
  geometry: any;
}

interface GeoJSONData {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * Custom hook to load GeoJSON data from public folder
 * Caches the result to prevent re-fetching
 */
export function useGeoJSON(path: string): GeoJSONData | null {
  const [geoData, setGeoData] = useState<GeoJSONData | null>(null);

  useEffect(() => {
    let isMounted = true;

    console.log(`🔄 Fetching GeoJSON from: ${path}`);

    fetch(path)
      .then((res) => {
        console.log(`📡 Fetch response status: ${res.status} ${res.statusText}`);
        if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          console.log(`✅ GeoJSON loaded: ${path} (${data.features?.length || 0} features)`);
          setGeoData(data);
        }
      })
      .catch((err) => {
        console.error(`❌ GeoJSON load error for ${path}:`, err);
        console.error(`   Make sure the file exists at: public${path}`);
        if (isMounted) setGeoData(null);
      });

    return () => {
      isMounted = false;
    };
  }, [path]);

  return geoData;
}
