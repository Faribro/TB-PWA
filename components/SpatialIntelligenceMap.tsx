'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { GeoJsonLayer, ColumnLayer, TextLayer } from '@deck.gl/layers';
import { LightingEffect, AmbientLight, PointLight } from '@deck.gl/core';
import Map from 'react-map-gl/maplibre';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Activity, X, Pin, Sparkles, Send } from 'lucide-react';
import { useTreeFilter } from '@/contexts/TreeFilterContext';
import { useUniversalFilter } from '@/contexts/FilterContext';
import { FlyToInterpolator } from '@deck.gl/core';
import { CommandCenterLayout } from './CommandCenterLayout';
import { useMagicLens } from '@/hooks/useMagicLens';
import { MagicLensTooltip } from './MagicLensTooltip';
import { fetchVectorArcs, VectorArc } from '@/utils/epidemiology';

const CascadeFunnelPanel = dynamic(() => import('./CascadeFunnelPanel').then(mod => mod.CascadeFunnelPanel), { ssr: false });
const DistrictLeaderboard = dynamic(() => import('./DistrictLeaderboard').then(mod => mod.DistrictLeaderboard), { ssr: false });
const DepthSegmentedControl = dynamic(() => import('./DepthSegmentedControl').then(mod => mod.DepthSegmentedControl), { ssr: false });
const MapKPIOverlay = dynamic(() => import('./MapKPIOverlay').then(mod => mod.MapKPIOverlay), { ssr: false });
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useChoroplethDictionary, ChoroplethMetrics } from '@/hooks/useChoroplethDictionary';
import { useGeoJSON } from '@/hooks/useGeoJSON';
import { normalizeGeographicKey } from '@/lib/normalizeGeographicKey';
import { feature } from 'topojson-client';
import { useEntityStore } from '@/stores/useEntityStore';
import maplibregl from 'maplibre-gl';

const fetcher = (url: string) => fetch(url).then(r => r.json());


const DeckGL = dynamic(() => import('@deck.gl/react').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-white" />
});

const STATE_FILE_MAP: Record<string, string> = {
  'maharashtra': 'maharashtra',
  'karnataka': 'karnataka',
  'delhi': 'delhi',
  'tamil nadu': 'tamilnadu',
  'uttar pradesh': 'uttar-pradesh',
  'west bengal': 'west-bengal',
  'gujarat': 'gujarat',
  'rajasthan': 'rajasthan',
  'madhya pradesh': 'madhya-pradesh',
  'andhra pradesh': 'andhra-pradesh',
  'telangana': 'telangana',
  'kerala': 'kerala',
  'bihar': 'bihar',
  'odisha': 'odisha',
  'punjab': 'punjab',
  'haryana': 'haryana',
  'jharkhand': 'jharkhand',
  'chhattisgarh': 'chhattisgarh',
  'assam': 'assam',
  'uttarakhand': 'uttarakhand',
  'himachal pradesh': 'himachal-pradesh',
  'goa': 'goa',
  'jammu and kashmir': 'jammu-and-kashmir',
  'ladakh': 'ladakh',
  'mizoram': 'mizoram',
  'chandigarh': 'chandigarh',
  'arunachal pradesh': 'arunachal-pradesh',
  'manipur': 'manipur',
  'meghalaya': 'meghalaya',
  'nagaland': 'nagaland',
  'sikkim': 'sikkim',
  'tripura': 'tripura',
  'andaman and nicobar islands': 'andaman-and-nicobar-islands',
  'dnh and dd': 'dnh-and-dd',
  'lakshadweep': 'lakshadweep',
  'puducherry': 'puducherry',
};

interface PinnedInsight {
  id: string;
  district: string;
  breachRate: number;
  patients: number;
  breaches: number;
}

interface Patient {
  id: number;
  inmate_name: string;
  unique_id: string;
  screening_district: string;
  screening_state: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  att_completion_date?: string | null;
  screening_date: string;
  facility_name?: string;
  staff_name?: string;
}

type ActiveMetric = 'screened' | 'diagnosed' | 'initiated' | 'completed' | 'breaches' | 'suspected' | 'normal';

interface TooltipData {
  totalPatients: number;
  slaBreaches: number;
  clusterName: string;
  primaryCoordinator: string;
  breachPercentage: number;
}

interface CityData {
  city: string;
  lat: string;
  lng: string;
  admin_name: string;
  population: string;
}

// Global cache for parsed date strings to avoid GC pressure and CPU overhead in O(N) loops
const dateCache = new globalThis.Map<string, number>();

const parseDateToMs = (dateStr: string): number => {
  if (!dateStr) return 0;
  const cached = dateCache.get(dateStr);
  if (cached !== undefined) return cached;
  const ms = new Date(dateStr).getTime();
  dateCache.set(dateStr, ms);
  return ms;
};

interface SpatialIntelligenceMapProps {
  globalPatients?: Patient[];
}

export default memo(function SpatialIntelligenceMap({ globalPatients = [] }: SpatialIntelligenceMapProps) {
  const { filter: treeFilter } = useTreeFilter();
  const { filter, setDistrict, setState } = useUniversalFilter();
  
  // Magic Lens integration
  const { isLensActive, hoveredDistrict, mouseXRef, mouseYRef, updateMousePosition, updateHoveredDistrict, toggleLens } = useMagicLens();
  
  // Store filter setters in refs to avoid dependency array issues
  const setDistrictRef = useRef(setDistrict);
  const setStateRef = useRef(setState);
  
  useEffect(() => {
    setDistrictRef.current = setDistrict;
    setStateRef.current = setState;
  }, [setDistrict, setState]);
  
  const [viewState, setViewState] = useState<any>({
    longitude: 78.4,
    latitude: 20.5,
    zoom: 5,
    pitch: 55,
    bearing: -15
  });
  const [isClient, setIsClient] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(false);
  const [webGLError, setWebGLError] = useState<string | null>(null);
  const [showCascade, setShowCascade] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<'auto' | 'state' | 'district' | 'facility'>('auto');
  const activeGISMetric = useEntityStore(s => s.activeGISMetric);
  const setActiveGISMetric = useEntityStore(s => s.setActiveGISMetric);
  const activeMetric = (activeGISMetric || 'screened') as ActiveMetric;
  const setActiveMetric = useCallback((metric: ActiveMetric) => {
    setActiveGISMetric(metric);
  }, [setActiveGISMetric]);

  const [hoveredHUD, setHoveredHUD] = useState<{ district: string; breachRate: number; patients: number; x: number; y: number; yieldPercent?: number } | null>(null);
  const [pinnedInsights, setPinnedInsights] = useState<PinnedInsight[]>([]);
  const [citiesData, setCitiesData] = useState<CityData[]>([]);
  const [topoGeoData, setTopoGeoData] = useState<any>(null);
  const [highlightedTarget, setHighlightedTarget] = useState<string | null>(null);
  const [isVectorEngineActive, setIsVectorEngineActive] = useState(false);
  const [vectorArcsData, setVectorArcsData] = useState<VectorArc[]>([]);
  const [isLoadingVectors, setIsLoadingVectors] = useState(false);
  const deckRef = useRef<any>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const permissions = useRolePermissions();
  const showGISLeaderboard = useEntityStore(s => s.showGISLeaderboard);
  const showGISCascade = useEntityStore(s => s.showGISCascade);
  const sonicFlyTarget = useEntityStore(s => s.sonicFlyTarget);
  const setSonicFlyTarget = useEntityStore(s => s.setSonicFlyTarget);
  const setShowGISLeaderboard = useEntityStore(s => s.setShowGISLeaderboard);
  const setShowGISCascade = useEntityStore(s => s.setShowGISCascade);
  const setMapInstance = useEntityStore(s => s.setMapInstance);
  const setSonicDeepScanTarget = useEntityStore(s => s.setSonicDeepScanTarget);
  const setSonicDeepScanData = useEntityStore(s => s.setSonicDeepScanData);
  
  // Temporal Mapping State
  const isTemporalMode = useEntityStore(s => s.isTemporalMode);
  const currentPlayhead = useEntityStore(s => s.currentPlayhead);

  // Sync highlightedTarget with filter.district for visual feedback
  useEffect(() => {
    if (filter.district) {
      setHighlightedTarget(filter.district);
      const timer = setTimeout(() => setHighlightedTarget(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [filter.district]);

  useEffect(() => {
    setIsClient(true);
    
    // Check WebGL support with delay
    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl && (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext)) {
          setWebGLSupported(true);
        } else {
          console.error('WebGL context not available');
          setWebGLSupported(false);
        }
      } catch (error) {
        console.error('WebGL initialization error:', error);
        setWebGLSupported(false);
      }
    }, 100);
  }, []);

  // Apply filters to patients with normalized geographic matching (optimized single-pass O(N) engine)
  const filteredPatients = useMemo(() => {
    const stateKey = filter.state ? normalizeGeographicKey(filter.state) : null;
    const districtKey = filter.district ? normalizeGeographicKey(filter.district) : null;
    const treeDistrictKey = treeFilter?.district ? normalizeGeographicKey(treeFilter.district) : null;
    const status = filter.status;
    const nowMs = Date.now();

    return globalPatients.filter(p => {
      if (!p) return false;
      
      if (treeDistrictKey && normalizeGeographicKey(p.screening_district) !== treeDistrictKey) {
        return false;
      }
      
      if (stateKey && normalizeGeographicKey(p.screening_state) !== stateKey) {
        return false;
      }
      
      if (districtKey && normalizeGeographicKey(p.screening_district) !== districtKey) {
        return false;
      }
      
      if (status !== 'All') {
        switch (status) {
          case 'Suspected':
            return !p.tb_diagnosed || (p.tb_diagnosed !== 'Yes' && p.tb_diagnosed !== 'Y' && p.tb_diagnosed !== 'No');
          
          case 'Normal':
            return p.tb_diagnosed === 'No' || p.tb_diagnosed === 'N';
          
          case 'High Alert': {
            if (p.referral_date || !p.screening_date) return false;
            const screeningTime = parseDateToMs(p.screening_date);
            const daysSince = (nowMs - screeningTime) / (1000 * 60 * 60 * 24);
            return daysSince > 7;
          }
          
          case 'On Track': {
            if (p.referral_date) return true;
            if (!p.screening_date) return true;
            const screeningTime = parseDateToMs(p.screening_date);
            const daysSince = (nowMs - screeningTime) / (1000 * 60 * 60 * 24);
            return daysSince <= 7;
          }
            
          case 'Diagnosed':
            return p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y';
            
          case 'Initiated':
            return !!p.att_start_date;
            
          case 'Completed':
            return !!p.att_completion_date;
            
          case 'Breach': {
            if (p.referral_date || !p.screening_date) return false;
            const screeningTime = parseDateToMs(p.screening_date);
            const daysSince = (nowMs - screeningTime) / (1000 * 60 * 60 * 24);
            return daysSince > 7;
          }
            
          default:
            return true;
        }
      }
      
      return true;
    });
  }, [globalPatients, treeFilter, filter.state, filter.district, filter.status]);

  // Map patients: Show all patients in selected state, or all data if no state filter (optimized single-pass O(N) engine)
  const mapPatients = useMemo(() => {
    const stateKey = filter.state ? normalizeGeographicKey(filter.state) : null;

    return globalPatients.filter(p => {
      if (!p) return false;

      if (isTemporalMode) {
        const dateValue = p.screening_date;
        if (!dateValue) return false;
        const pDate = parseDateToMs(dateValue);
        if (pDate > currentPlayhead) return false;
      }

      if (stateKey && normalizeGeographicKey(p.screening_state) !== stateKey) {
        return false;
      }

      return true;
    });
  }, [globalPatients, filter.state, isTemporalMode, currentPlayhead]);

  const lastResolutionRef = useRef<'state' | 'district'>('state');

  // Determine depth level based on heatmap mode
  const depthLevel = useMemo(() => {
    if (filter.state) {
      lastResolutionRef.current = 'district';
      return 'district';
    }

    if (heatmapMode === 'auto') {
      const zoom = viewState.zoom;
      const prev = lastResolutionRef.current;
      
      let nextRes: 'state' | 'district' = prev;
      if (zoom < 5.8) {
        nextRes = 'state';
      } else if (zoom >= 6.2) {
        nextRes = 'district';
      }
      
      lastResolutionRef.current = nextRes;
      return nextRes;
    }

    const nextRes = heatmapMode === 'state' ? 'state' : 'district';
    lastResolutionRef.current = nextRes;
    return nextRes;
  }, [heatmapMode, viewState.zoom, filter.state]);

  // Load TopoJSON and convert to GeoJSON
  useEffect(() => {
    // Avoid tying GeoJSON loading to large/volatile datasets (like mapPatients).
    // Load either the selected state or all available states exactly once per selection change.
    const stateKey = (filter.state || '').toLowerCase();
    const stateFile = stateKey ? STATE_FILE_MAP[stateKey] : null;
    const statesToLoad = stateFile ? [stateFile] : Object.values(STATE_FILE_MAP);

    let cancelled = false;
    Promise.all(
      statesToLoad.map(stateFileName =>
        fetch(`/geojson/states/${stateFileName}.json`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to load ${stateFileName}`);
            return res.json();
          })
          .then(topology => {
            const objectKey = Object.keys(topology.objects)[0];
            const geojson: any = feature(topology, topology.objects[objectKey]);
            
            // Defensive: ensure we return an array of features
            if (geojson.type === 'FeatureCollection') {
              return geojson.features;
            } else if (geojson.type === 'Feature') {
              return [geojson];
            }
            return [];
          })
          .then(features => {
            // Further filter to remove features without geometry or with invalid structure
            return (features || []).filter((f: any) => f && f.geometry);
          })
          .catch(() => [])
      )
    )
      .then(results => {
        if (cancelled) return;
        const allFeatures = results.flat();
        setTopoGeoData({ type: 'FeatureCollection', features: allFeatures });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [filter.state]);

  // Load cities data
  useEffect(() => {
    fetch('/geojson/cities.json')
      .then(res => res.json())
      .then(setCitiesData)
      .catch(err => console.error('Failed to load cities:', err));
  }, []);

  const geoData = topoGeoData;

  // ─── Server-side choropleth (full DB aggregation) ───────────────────────────
  const geoChoroplethUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filter.state) params.set('state', filter.state);
    if (filter.district) params.set('district', filter.district);
    const query = params.toString();
    return `/api/vertex/geo-choropleth${query ? `?${query}` : ''}`;
  }, [filter.state, filter.district]);

  const { data: geoChoroplethData } = useSWR<{
    districts: Record<string, ChoroplethMetrics>;
    states:    Record<string, ChoroplethMetrics>;
  }>(geoChoroplethUrl, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  // Build the choropleth Map from server data (preferred) or fall back to client scan
  const clientChoroplethDict = useChoroplethDictionary(mapPatients, depthLevel);
  const choroplethDict = useMemo((): Map<string, ChoroplethMetrics> => {
    if (!geoChoroplethData) return clientChoroplethDict;
    const source = depthLevel === 'state' ? geoChoroplethData.states : geoChoroplethData.districts;
    const dict = new globalThis.Map<string, ChoroplethMetrics>();
    for (const [key, metrics] of Object.entries(source)) {
      dict.set(key, metrics);
    }
    return dict;
  }, [geoChoroplethData, depthLevel, clientChoroplethDict]);

  // Dedicated district-level dictionary for 3D city pillars (always resolved at district granularity)
  const clientDistrictDict = useChoroplethDictionary(mapPatients, 'district');
  const districtChoroplethDict = useMemo((): Map<string, ChoroplethMetrics> => {
    if (!geoChoroplethData) return clientDistrictDict;
    const dict = new globalThis.Map<string, ChoroplethMetrics>();
    for (const [key, metrics] of Object.entries(geoChoroplethData.districts)) {
      dict.set(key, metrics);
    }
    return dict;
  }, [geoChoroplethData, clientDistrictDict]);



  // Extract unique coordinators for filter
  const uniqueCoordinators = useMemo(() => {
    const coordinators = new Set<string>();
    filteredPatients.forEach(p => {
        if (p.staff_name) coordinators.add(p.staff_name);
    });
    return Array.from(coordinators).sort();
  }, [filteredPatients]);

  // Color scale engine: Legend-aware RGBA based on active metric
  const getColorFromMetric = useCallback((metrics: ChoroplethMetrics | undefined, metric: ActiveMetric): [number, number, number, number] => {
    if (!metrics || metrics.screened === 0) {
      return [30, 41, 59, 100]; // Slate-800 for no data
    }

    const value = metrics[metric] || 0;
    const screened = metrics.screened || 1;
    const percentage = Math.min(Math.max((value / screened) * 100, 0), 100);

    // 1. SCREENED: Cyan/Indigo (Volume-based)
    if (metric === 'screened') {
      const maxScreened = 500;
      const intensity = Math.min(Math.max(value / maxScreened, 0), 1);
      if (intensity > 0.8) return [79, 70, 229, 220];    // Indigo
      if (intensity > 0.6) return [99, 102, 241, 200];   // Indigo-light
      if (intensity > 0.4) return [6, 182, 212, 220];    // Cyan
      if (intensity > 0.2) return [14, 165, 233, 180];   // Sky
      return [14, 165, 233, 120];                        // Dim Sky
    }

    // 2. DIAGNOSED: Amber/Orange scale (high = high alert)
    if (metric === 'diagnosed') {
      if (value > 20) return [217, 119, 6, 230];   // Dark Amber
      if (value > 10) return [245, 158, 11, 210];  // Amber
      if (value > 5) return [251, 191, 36, 190];   // Amber-light
      if (value > 0) return [253, 224, 71, 160];   // Yellow-dim
      return [100, 116, 139, 140];                 // Slate for 0 cases
    }

    // 3. SUSPECTED: Yellow/Gold scale (high = attention needed)
    if (metric === 'suspected') {
      if (value > 150) return [234, 179, 8, 230];  // Gold/Yellow-700
      if (value > 80) return [250, 204, 21, 210];  // Yellow-600
      if (value > 30) return [253, 224, 71, 180];  // Yellow-400
      if (value > 0) return [254, 240, 138, 150];  // Yellow-200
      return [100, 116, 139, 140];                 // Slate
    }

    // 4. NORMAL: Emerald/Green (high = healthy)
    if (metric === 'normal') {
      const maxNormal = 500;
      const intensity = Math.min(Math.max(value / maxNormal, 0), 1);
      if (intensity > 0.8) return [5, 150, 105, 220];   // Emerald-600
      if (intensity > 0.5) return [16, 185, 129, 200];  // Emerald-500
      if (intensity > 0.2) return [52, 211, 153, 180];  // Emerald-400
      return [110, 231, 183, 140];                      // Emerald-300
    }

    // 5. INITIATED (ATT): Purple scale (treatment initiation)
    if (metric === 'initiated') {
      if (value > 20) return [109, 40, 217, 230];   // Violet-700
      if (value > 10) return [139, 92, 246, 210];   // Violet-500
      if (value > 5) return [167, 139, 250, 180];   // Violet-400
      if (value > 0) return [196, 181, 253, 150];   // Violet-300
      return [100, 116, 139, 140];                  // Slate
    }

    // 6. COMPLETED: Green/Teal scale (successful completions)
    if (metric === 'completed') {
      if (value > 10) return [15, 118, 110, 230];   // Teal-700
      if (value > 5) return [20, 184, 166, 210];    // Teal-500
      if (value > 2) return [45, 212, 191, 180];    // Teal-400
      if (value > 0) return [94, 234, 212, 150];    // Teal-300
      return [100, 116, 139, 140];                  // Slate
    }

    // 7. BREACHES: Red/Warning scale
    if (metric === 'breaches') {
      const breachPercent = Math.min(Math.max((value / screened) * 100, 0), 100);
      if (breachPercent > 90) return [153, 27, 27, 255];   // Deep red
      if (breachPercent > 70) return [239, 68, 68, 220];   // Red
      if (breachPercent >= 40) return [245, 158, 11, 200]; // Amber
      if (breachPercent < 20) return [16, 185, 129, 220];  // Emerald
      return [100, 116, 139, 160];                         // Slate
    }

    return [100, 116, 139, 140];
  }, []);

  // Polished two-step flyTo with perfect framing
  // Calculate bounding box for a feature coordinates
  const getBBox = (coordinates: any[]): [number, number, number, number] => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    const processCoords = (coords: any[]) => {
      coords.forEach(c => {
        if (typeof c[0] === 'number') {
          minX = Math.min(minX, c[0]);
          minY = Math.min(minY, c[1]);
          maxX = Math.max(maxX, c[0]);
          maxY = Math.max(maxY, c[1]);
        } else {
          processCoords(c);
        }
      });
    };
    
    processCoords(coordinates);
    return [minX, minY, maxX, maxY];
  };

  // Pre-calculate and cache centroids/bboxes for loaded GeoJSON features to avoid traversing coordinates on every render
  const geoMetadataCache = useMemo(() => {
    const cache = new globalThis.Map<string, { center: [number, number], bbox: [number, number, number, number] }>();
    if (!geoData || !geoData.features) return cache;
    
    // Process states
    const stateGroups = new globalThis.Map<string, any[]>();
    geoData.features.forEach((f: any) => {
      const stateName = f.properties?.st_nm || f.properties?.NAME_1 || f.properties?.state || '';
      if (stateName) {
        const key = normalizeGeographicKey(stateName);
        if (!stateGroups.has(key)) stateGroups.set(key, []);
        stateGroups.get(key)!.push(f);
      }
      
      // Process individual district metadata
      const districtName = f.properties?.district || f.properties?.NAME_2 || f.properties?.dtname || '';
      if (districtName && f.geometry && f.geometry.coordinates) {
        const key = normalizeGeographicKey(districtName);
        const bbox = getBBox(f.geometry.coordinates);
        const center: [number, number] = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
        cache.set(`district-${key}`, { center, bbox });
      }
    });
    
    // Process state groups metadata
    stateGroups.forEach((features, key) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      features.forEach(f => {
        if (f.geometry && f.geometry.coordinates) {
          const bbox = getBBox(f.geometry.coordinates);
          minX = Math.min(minX, bbox[0]);
          minY = Math.min(minY, bbox[1]);
          maxX = Math.max(maxX, bbox[2]);
          maxY = Math.max(maxY, bbox[3]);
        }
      });
      if (minX !== Infinity) {
        cache.set(`state-${key}`, {
          center: [(minX + maxX) / 2, (minY + maxY) / 2],
          bbox: [minX, minY, maxX, maxY]
        });
      }
    });
    
    return cache;
  }, [geoData]);

  // Polished two-step flyTo with perfect framing
  const flyToDistrictInTwoSteps = useCallback((target: { lat: number; lng: number; district: string; bbox?: [number, number, number, number] }) => {
    // Calculate dynamic zoom based on BBOX if available
    let dynamicZoom = 8.8;
    if (target.bbox) {
      const [minX, minY, maxX, maxY] = target.bbox;
      const dx = maxX - minX;
      const dy = maxY - minY;
      const maxD = Math.max(dx, dy);
      // Heuristic: scale zoom based on size of district
      dynamicZoom = Math.min(10, Math.max(6.5, 9.5 - Math.log2(maxD / 0.18)));
    }

    // Step 1: Aggressive jump
    setViewState((prev: any) => ({
      ...prev,
      latitude: target.lat + 0.1,
      longitude: target.lng,
      zoom: dynamicZoom + 0.6,
      pitch: 52,
      bearing: -12,
      transitionDuration: 800,
      transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
    }));

    // Step 2: Settle back for perfect framing
    setTimeout(() => {
      setViewState((prev: any) => ({
        ...prev,
        latitude: target.lat,
        longitude: target.lng,
        zoom: dynamicZoom,
        pitch: 45,
        bearing: 0,
        transitionDuration: 1000,
        transitionInterpolator: new FlyToInterpolator({ speed: 1.2 }),
        transitionEasing: (t: number) => 1 - Math.pow(1 - t, 3), // ease-out-cubic
      }));
    }, 850);
  }, []);

  // Cinematic flyTo function for smooth district navigation
  const flyToDistrict = useCallback((district: string) => {
    const key = normalizeGeographicKey(district);
    
    // Check cache first
    const cached = geoMetadataCache.get(`district-${key}`);
    if (cached) {
      flyToDistrictInTwoSteps({
        lat: cached.center[1],
        lng: cached.center[0],
        district,
        bbox: cached.bbox
      });
      return;
    }
    
    // Fallback search
    if (geoData?.features) {
      const feature = geoData.features.find((f: any) => 
        normalizeGeographicKey(f.properties.district || f.properties.st_nm || '') === key
      );
      if (feature) {
        let latitude = 20.5, longitude = 78.4;
        let bbox: [number, number, number, number] | undefined;
        if (feature.geometry?.coordinates) {
          bbox = getBBox(feature.geometry.coordinates);
        }
        if (feature.properties?.centroidLat && feature.properties?.centroidLng) {
          latitude = feature.properties.centroidLat;
          longitude = feature.properties.centroidLng;
        } else if (bbox) {
          latitude = (bbox[1] + bbox[3]) / 2;
          longitude = (bbox[0] + bbox[2]) / 2;
        }
        flyToDistrictInTwoSteps({ lat: latitude, lng: longitude, district, bbox });
      }
    }
  }, [geoData, geoMetadataCache, flyToDistrictInTwoSteps]);

  // Dynamically generated state centroids and totals when zoomed out (depthLevel === 'state')
  const stateLabels = useMemo(() => {
    if (depthLevel !== 'state' || !geoData || !geoData.features) return [];
    
    // Group features by state name
    const stateGroups = new globalThis.Map<string, string>();
    
    geoData.features.forEach((f: any) => {
      const stateName = f.properties?.st_nm || f.properties?.NAME_1 || f.properties?.state || '';
      if (stateName) {
        stateGroups.set(normalizeGeographicKey(stateName), stateName);
      }
    });
    
    const labels: any[] = [];
    
    stateGroups.forEach((stateKey, key) => {
      const cached = geoMetadataCache.get(`state-${key}`);
      if (!cached) return;
      
      const metrics = choroplethDict.get(key);
      const val = metrics ? (metrics[activeMetric] || 0) : 0;
      
      if (val > 0) {
        labels.push({
          name: stateKey,
          value: val,
          position: cached.center,
          isState: true
        });
      }
    });
    
    return labels;
  }, [geoData, depthLevel, choroplethDict, activeMetric, geoMetadataCache]);

  // Dynamically generated district centroids and totals when zoomed in (depthLevel === 'district')
  const districtLabels = useMemo(() => {
    if (depthLevel !== 'district' || !geoData || !geoData.features) return [];
    
    return geoData.features.map((f: any) => {
      const districtName = f.properties?.district || f.properties?.NAME_2 || f.properties?.dtname || '';
      if (!districtName) return null;
      
      const key = normalizeGeographicKey(districtName);
      const cached = geoMetadataCache.get(`district-${key}`);
      if (!cached) return null;
      
      const metrics = districtChoroplethDict.get(key);
      const val = metrics ? (metrics[activeMetric] || 0) : 0;
      
      return {
        name: districtName,
        value: val,
        position: cached.center,
        isState: false
      };
    }).filter(Boolean).filter((d: any) => d!.value > 0);
  }, [geoData, depthLevel, districtChoroplethDict, activeMetric, geoMetadataCache]);

  // Combined active map labels based on zoom depthLevel
  const dynamicMapLabels = useMemo(() => {
    return depthLevel === 'state' ? stateLabels : districtLabels;
  }, [depthLevel, stateLabels, districtLabels]);

  // Dynamic scaling: Find the max value of the selected metric across the currently active map labels
  const maxActiveMetricValue = useMemo(() => {
    let max = 1;
    dynamicMapLabels.forEach((d) => {
      if (d.value > max) max = d.value;
    });
    return max;
  }, [dynamicMapLabels]);

  // 3D GeoJSON Choropleth Layer with hardware acceleration
  const choroplethLayer = useMemo(() => {
    if (!isClient || !webGLSupported || !geoData || choroplethDict.size === 0) return null;

    try {
      return new GeoJsonLayer({
        id: 'choropleth-layer',
        data: geoData,
        pickable: true,
        autoHighlight: true,
        stroked: true,
        filled: true,
        extruded: true,
        wireframe: false,
        lineWidthMinPixels: 2,
        // Disable problematic features that might cause WebGL errors
        parameters: {
          depthTest: true,
          depthMask: true,
          blend: true,
          blendFunc: [770, 771, 1, 771],
          blendEquation: 32774
        },
        getElevation: (d: any) => {
          if (!d || !d.properties) return 1000;
          const districtName = d.properties.district || d.properties.NAME_2 || d.properties.dtname || '';
          const stateName = d.properties.st_nm || d.properties.NAME_1 || d.properties.state || '';
          const useState = depthLevel === 'state';
          const name = useState ? stateName : districtName;
          const key = normalizeGeographicKey(name || districtName || stateName || '');
          const metrics = choroplethDict.get(key);
          if (!metrics) {
            return 1000;
          }
          const val = metrics[activeMetric] || 0;
          // Guard against NaN, Infinity, or non-numeric values which crash deck.gl
          if (!Number.isFinite(val) || isNaN(val)) {
            return 1000;
          }
          const baseHeight = maxActiveMetricValue > 0 ? (val / maxActiveMetricValue) * 30000 : 0;
          const elevation = Math.max(baseHeight, 1000);
          // Final safety check
          return Number.isFinite(elevation) ? elevation : 1000;
        },
        getFillColor: (d: any, { index }: { index: number }) => {
          if (!d || !d.properties) return [30, 41, 59, 100];
          
          // Fallback for multiple GeoJSON property name conventions
          const districtName = d.properties.district || d.properties.NAME_2 || d.properties.dtname || '';
          const stateName = d.properties.st_nm || d.properties.NAME_1 || d.properties.state || '';
          const useState = depthLevel === 'state';
          const name = useState ? stateName : districtName;
          const key = normalizeGeographicKey(name || districtName || stateName || '');
          const metrics = choroplethDict.get(key);
          const isHovered = hoveredHUD?.district === name;
          
          // Robust case-insensitive highlight comparison
          const isHighlighted = highlightedTarget && 
            (normalizeGeographicKey(districtName) === normalizeGeographicKey(highlightedTarget) ||
             normalizeGeographicKey(stateName) === normalizeGeographicKey(highlightedTarget));
          
          const isStateSelected = filter.state && 
            normalizeGeographicKey(stateName) === normalizeGeographicKey(filter.state);
          const isDistrictSelected = filter.district && 
            normalizeGeographicKey(districtName) === normalizeGeographicKey(filter.district);
          
          // Priority 1: Highlighted target (Sonic laser) - Bright Cyan
          if (isHighlighted) {
            return [6, 182, 212, 255];
          }
          
          // Priority 2: Selected district - Enhanced color
          if (isDistrictSelected && metrics) {
            const color = getColorFromMetric(metrics, activeMetric);
            return isHovered 
              ? [Math.min(color[0] + 80, 255), Math.min(color[1] + 80, 255), Math.min(color[2] + 100, 255), 255]
              : [Math.min(color[0] + 40, 255), Math.min(color[1] + 40, 255), Math.min(color[2] + 60, 255), 240];
          }
          
          if (!metrics) {
            if (isStateSelected) {
              return isHovered ? [100, 200, 255, 200] : [6, 182, 212, 160];
            }
            return isHovered ? [60, 60, 80, 180] : [40, 40, 60, 80];
          }
          
          const color = getColorFromMetric(metrics, activeMetric);
          
          if (highlightedTarget && !isHighlighted) {
            return [color[0] * 0.4, color[1] * 0.4, color[2] * 0.4, 120];
          }
          
          if (isStateSelected) {
            return isHovered 
              ? [Math.min(color[0] + 50, 255), Math.min(color[1] + 50, 255), Math.min(color[2] + 80, 255), 240]
              : [color[0], color[1], Math.min(color[2] + 40, 255), 220];
          }
          
          return isHovered ? [color[0], color[1], color[2] + 50, 240] : color;
        },
        getLineColor: (d: any) => {
          const districtName = d.properties.district || d.properties.NAME_2 || d.properties.dtname || '';
          const stateName = d.properties.st_nm || d.properties.NAME_1 || d.properties.state || '';
          
          const isHighlighted = highlightedTarget && 
            (normalizeGeographicKey(districtName) === normalizeGeographicKey(highlightedTarget) ||
             normalizeGeographicKey(stateName) === normalizeGeographicKey(highlightedTarget));
          
          const isStateSelected = filter.state && 
            normalizeGeographicKey(stateName) === normalizeGeographicKey(filter.state);
          const isDistrictSelected = filter.district && 
            normalizeGeographicKey(districtName) === normalizeGeographicKey(filter.district);
          
          if (isHighlighted) return [255, 255, 255, 255];
          if (isDistrictSelected) return [255, 255, 255, 255];
          if (isStateSelected) return [0, 255, 255, 200];
          
          return [80, 80, 100, 50];
        },
        getLineWidth: (d: any) => {
          const districtName = d.properties.district || d.properties.NAME_2 || d.properties.dtname || '';
          const stateName = d.properties.st_nm || d.properties.NAME_1 || d.properties.state || '';
          
          const isStateSelected = filter.state && 
            normalizeGeographicKey(stateName) === normalizeGeographicKey(filter.state);
          const isDistrictSelected = filter.district && 
            normalizeGeographicKey(districtName) === normalizeGeographicKey(filter.district);
          
          if (isDistrictSelected) return 1000;
          if (isStateSelected) return 400;
          return 2;
        },
        material: {
          ambient: 0.2,
          diffuse: 0.8,
          shininess: 40,
          specularColor: [60, 64, 70]
        },
        updateTriggers: {
          getFillColor: [activeMetric, choroplethDict, depthLevel, hoveredHUD, filter.state, filter.district, highlightedTarget, isTemporalMode, currentPlayhead, maxActiveMetricValue],
          getElevation: [activeMetric, choroplethDict, depthLevel, isTemporalMode, currentPlayhead, maxActiveMetricValue],
          getLineColor: [filter.state, filter.district, highlightedTarget, isTemporalMode, currentPlayhead],
          getLineWidth: [filter.state, filter.district, isTemporalMode, currentPlayhead]
        },
        transitions: {
          getFillColor: { duration: 400, easing: t => t * (2 - t) },
          getElevation: { duration: 600, type: 'spring' }
        },
        onClick: (info: any) => {
          if (info.object) {
            const districtName = info.object.properties.district || info.object.properties.NAME_2 || info.object.properties.dtname || '';
            const stateName = info.object.properties.st_nm || info.object.properties.NAME_1 || info.object.properties.state || '';
            const useState = depthLevel === 'state';
            const name = useState ? stateName : districtName;
            
            // Magic Lens Neural Link: If lens is active, trigger Sonic deep scan
            if (isLensActive && name) {
              const key = normalizeGeographicKey(name);
              const metrics = choroplethDict.get(key);
              
              if (metrics) {
                // Dispatch to Sonic for deep scan
                setSonicDeepScanTarget(name);
                setSonicDeepScanData({
                  district: name,
                  screened: metrics.screened,
                  breaches: metrics.breaches,
                  breachRate: metrics.screened > 0 ? (metrics.breaches / metrics.screened) * 100 : 0,
                });
                
                // Highlight the target on map
                if (useState) {
                  setSonicFlyTarget({ state: name });
                } else {
                  setSonicFlyTarget({ district: name });
                }
              }
              
              return; // Prevent normal click behavior
            }
            
            // Normal click behavior (when lens is not active)
            if (districtName) {
              flyToDistrict(districtName);
              if (normalizeGeographicKey(filter.district || '') === normalizeGeographicKey(districtName)) {
                setDistrict('');
              } else {
                setDistrict(districtName);
              }
            }
          }
        },
        onHover: (info: any) => {
          // Magic Lens: Update position and district without triggering global state
          if (isLensActive) {
            updateMousePosition(info.x, info.y);
            if (info.object) {
              const districtName = info.object.properties.district || info.object.properties.NAME_2 || info.object.properties.dtname || '';
              const stateName = info.object.properties.st_nm || info.object.properties.NAME_1 || info.object.properties.state || '';
              const useState = depthLevel === 'state';
              const name = useState ? stateName : districtName;
              const key = normalizeGeographicKey(name || districtName || stateName || '');
              const metrics = choroplethDict.get(key);
              
              if (metrics) {
                updateHoveredDistrict({
                  properties: {
                    district: name,
                    screened: metrics.screened,
                    breaches: metrics.breaches,
                    sla_breaches: metrics.breaches,
                  }
                });
              } else {
                updateHoveredDistrict(null);
              }
            } else {
              updateHoveredDistrict(null);
            }
            return; // Skip normal hover logic when lens is active
          }
          
          // Normal hover logic (existing)
          if (info.object) {
            const districtName = info.object.properties.district || info.object.properties.NAME_2 || info.object.properties.dtname || '';
            const stateName = info.object.properties.st_nm || info.object.properties.NAME_1 || info.object.properties.state || '';
            const useState = depthLevel === 'state';
            const name = useState ? stateName : districtName;
            const key = normalizeGeographicKey(name || districtName || stateName || '');
            const metrics = choroplethDict.get(key);
            
            if (metrics) {
              const breachRate = metrics.screened > 0 ? (metrics.breaches / metrics.screened) * 100 : 0;
              const yieldPercent = metrics.screened > 0 ? (metrics.diagnosed / metrics.screened) * 100 : 0;
              setHoveredHUD({
                district: name,
                breachRate,
                patients: metrics.screened,
                yieldPercent,
                x: info.x,
                y: info.y
              });
            } else if (name) {
              setHoveredHUD({
                district: name,
                breachRate: 0,
                patients: 0,
                yieldPercent: 0,
                x: info.x,
                y: info.y
              });
            }
          } else {
            setHoveredHUD(null);
          }
        }
      });
    } catch (error) {
      console.error('Error creating choropleth layer:', error);
      return null;
    }
  }, [isClient, webGLSupported, geoData, choroplethDict, depthLevel, activeMetric, getColorFromMetric, setDistrict, filter.state, filter.district, hoveredHUD, flyToDistrict, maxActiveMetricValue]);

  // City Pillars Layer (Glowing Columns) - Wired to Active Metric
  const hoveredHUDRef = useRef(hoveredHUD);
  useEffect(() => { hoveredHUDRef.current = hoveredHUD; }, [hoveredHUD]);

  const cityPillarsLayer = useMemo(() => {
    if (!isClient || !webGLSupported || dynamicMapLabels.length === 0) return null;

    return new ColumnLayer({
      id: 'city-pillars-layer',
      data: dynamicMapLabels,
      pickable: true,
      extruded: true,
      diskResolution: 6,
      radius: depthLevel === 'state' ? 18000 : 8000,
      material: {
        ambient: 0.2,
        diffuse: 0.8,
        shininess: 40,
        specularColor: [100, 100, 255]
      },
      getPosition: (d: any) => d.position,
      getElevation: (d: any) => {
        const value = d.value;
        const baseHeight = maxActiveMetricValue > 0 ? (value / maxActiveMetricValue) * 50000 : 0;
        const isInHoveredDistrict = hoveredHUDRef.current && 
          normalizeGeographicKey(d.name) === normalizeGeographicKey(hoveredHUDRef.current.district);
        return isInHoveredDistrict ? baseHeight * 1.5 : baseHeight;
      },
      getFillColor: (d: any) => {
        const isInHoveredDistrict = hoveredHUDRef.current && 
          normalizeGeographicKey(d.name) === normalizeGeographicKey(hoveredHUDRef.current.district);
        
        if (isInHoveredDistrict) {
          return [100, 200, 255, 255];
        }
        
        const key = normalizeGeographicKey(d.name);
        const dictToUse = depthLevel === 'state' ? choroplethDict : districtChoroplethDict;
        const metrics = dictToUse.get(key);
        const color = getColorFromMetric(metrics, activeMetric);
        return color;
      },
      updateTriggers: {
        getElevation: [hoveredHUD, activeMetric, activeGISMetric, dynamicMapLabels, maxActiveMetricValue],
        getFillColor: [hoveredHUD, activeMetric, activeGISMetric, choroplethDict, districtChoroplethDict, depthLevel, dynamicMapLabels, maxActiveMetricValue]
      }
    });
  }, [isClient, webGLSupported, dynamicMapLabels, depthLevel, activeMetric, activeGISMetric, choroplethDict, districtChoroplethDict, maxActiveMetricValue]);

  // City Pillars Text Layer (Numbers on top of Columns with Dynamic Scaling & Glow)
  const cityPillarsTextLayer = useMemo(() => {
    if (!isClient || !webGLSupported || dynamicMapLabels.length === 0) return null;

    return new TextLayer({
      id: 'city-pillars-text-layer',
      data: dynamicMapLabels,
      parameters: {
        depthTest: false,
        blend: true
      },
      getPosition: (d: any) => {
        const value = d.value;
        const baseHeight = maxActiveMetricValue > 0 ? (value / maxActiveMetricValue) * 50000 : 0;
        const isInHoveredDistrict = hoveredHUDRef.current && 
          normalizeGeographicKey(d.name) === normalizeGeographicKey(hoveredHUDRef.current.district);
        
        const finalPosition = d.position || [0, 0];
        return [finalPosition[0], finalPosition[1], (isInHoveredDistrict ? baseHeight * 1.5 : baseHeight) + 8000];
      },
      getText: (d: any) => {
        if (d.isState) {
          return `${d.name.toUpperCase()}\n${d.value.toLocaleString()}`;
        }
        return `${d.name}\n${d.value.toLocaleString()}`;
      },
      getSize: depthLevel === 'state' ? 18 : 14,
      sizeUnits: 'pixels',
      sizeScale: 1,
      sizeMinPixels: 12,
      sizeMaxPixels: 48,
      getColor: [255, 255, 255, 255],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 'bold',
      billboard: true,
      background: true,
      getBackgroundColor: [10, 12, 20, 220],
      getBorderColor: (d: any) => {
        const key = normalizeGeographicKey(d.name);
        const dictToUse = d.isState ? choroplethDict : districtChoroplethDict;
        const metrics = dictToUse.get(key);
        const color = getColorFromMetric(metrics, activeMetric);
        return [color[0], color[1], color[2], 255];
      },
      getBorderWidth: 2,
      backgroundPadding: [12, 8, 12, 8],
      fontSettings: {
        sdf: true,
        buffer: 4,
        cutoff: 0.25,
        radius: 8
      },
      updateTriggers: {
        getPosition: [hoveredHUD, activeMetric, activeGISMetric, dynamicMapLabels, maxActiveMetricValue],
        getText: [activeMetric, activeGISMetric, dynamicMapLabels, depthLevel, maxActiveMetricValue],
        getBorderColor: [activeMetric, activeGISMetric, choroplethDict, districtChoroplethDict, depthLevel]
      },
      transitions: {
        getPosition: { duration: 600, type: 'spring' }
      }
    });
  }, [isClient, webGLSupported, dynamicMapLabels, depthLevel, activeMetric, activeGISMetric, maxActiveMetricValue, choroplethDict, districtChoroplethDict, getColorFromMetric]);

  // Lighting effect for 3D visualization
  const lightingEffect = useMemo(() => {
    const ambientLight = new AmbientLight({
      color: [255, 255, 255],
      intensity: 0.4
    });

    const pointLight = new PointLight({
      color: [255, 255, 255],
      intensity: 2.0,
      position: [78, 21, 500000]
    });

    return new LightingEffect({ ambientLight, pointLight });
  }, []);

  // Performance guardrail: Memoized layers array - TextLayer MUST be last for proper depth rendering
  const layers = useMemo(() => {
    const layerList = [];
    if (choroplethLayer) layerList.push(choroplethLayer);
    if (cityPillarsLayer) layerList.push(cityPillarsLayer);
    if (cityPillarsTextLayer) layerList.push(cityPillarsTextLayer); // CRITICAL: Text layer last
    return layerList;
  }, [choroplethLayer, cityPillarsLayer, cityPillarsTextLayer]);

  // Handle district filter with smooth flyTo transition
  useEffect(() => {
    const activeDistrict = filter.district || treeFilter?.district;
    if (activeDistrict) {
      flyToDistrict(activeDistrict);
    } else if (!filter.state) {
      setViewState(prev => ({
        ...prev,
        longitude: 78.4,
        latitude: 20.5,
        zoom: 5.0,
        pitch: 55,
        bearing: -15,
        transitionDuration: 1500,
        transitionInterpolator: new FlyToInterpolator()
      }));
    }
  }, [filter.district, treeFilter?.district, filter.state, flyToDistrict]);

  // Handle state filter: smoothly fit the camera to the state boundary once loaded using the cached metadata
  useEffect(() => {
    if (!filter.state || !geoData) return;
    
    const key = normalizeGeographicKey(filter.state);
    const cached = geoMetadataCache.get(`state-${key}`);
    
    if (cached) {
      const bbox = cached.bbox;
      const latitude = cached.center[1];
      const longitude = cached.center[0];
      
      const dx = bbox[2] - bbox[0];
      const dy = bbox[3] - bbox[1];
      const maxD = Math.max(dx, dy);
      
      let zoom = 5.5;
      if (maxD < 1) zoom = 9.5;
      else if (maxD < 3) zoom = 7.5;
      else if (maxD < 5) zoom = 6.8;
      else if (maxD < 10) zoom = 6.2;
      
      setViewState(prev => ({
        ...prev,
        longitude,
        latitude,
        zoom,
        pitch: 50,
        bearing: -10,
        transitionDuration: 1800,
        transitionInterpolator: new FlyToInterpolator({ speed: 1.2 })
      }));
    }
  }, [filter.state, geoData, geoMetadataCache]);



  // ── Sonic leaderboard / cascade toggles ─────────────────────────
  useEffect(() => {
    if (!showGISLeaderboard) return;
    setShowLeaderboard(true);
    setShowGISLeaderboard(false);
  }, [showGISLeaderboard, setShowGISLeaderboard]);

  useEffect(() => {
    if (!showGISCascade) return;
    setShowCascade(true);
    setShowGISCascade(false);
  }, [showGISCascade, setShowGISCascade]);

  // ── Sonic flyTo district with polished framing ─────────────────────────────────────────
  useEffect(() => {
    if (!sonicFlyTarget || !geoData) return;

    const { district, state, metric } = sonicFlyTarget;

    // ─── Case 1: State Navigation ──────────────────────────────────────────
    if (state) {
      const stateKey = normalizeGeographicKey(state);
      const feature = geoData.features.find((f: any) => 
        normalizeGeographicKey(f.properties.st_nm || '') === stateKey ||
        normalizeGeographicKey(f.properties.NAME_1 || '') === stateKey
      );
      
      if (feature) {
        setHighlightedTarget(state);
        setStateRef.current(state);
        
        const bbox = getBBox(feature.geometry.coordinates);
        const latitude = (bbox[1] + bbox[3]) / 2;
        const longitude = (bbox[0] + bbox[2]) / 2;
        
        const dx = bbox[2] - bbox[0];
        const dy = bbox[3] - bbox[1];
        const maxD = Math.max(dx, dy);
        const dynamicZoom = Math.min(7.5, Math.max(5.5, 8.8 - Math.log2(maxD / 0.15)));

        setViewState((prev: any) => ({
          ...prev,
          latitude,
          longitude,
          zoom: dynamicZoom,
          pitch: 30,
          bearing: 0,
          transitionDuration: 1500,
          transitionInterpolator: new FlyToInterpolator({ speed: 1.2 }),
        }));
        
        setTimeout(() => setHighlightedTarget(null), 3000);
      }
    } 
    // ─── Case 2: District Navigation ───────────────────────────────────────
    else if (district) {
      // Try exact normalized match first
      const normalizedDistrict = normalizeGeographicKey(district);
      
      const districtKey = districtChoroplethDict.has(normalizedDistrict) 
        ? normalizedDistrict
        : Array.from(districtChoroplethDict.keys()).find(k => 
            k.includes(normalizedDistrict) || normalizedDistrict.includes(k)
          );
      
      const districtData = districtKey ? districtChoroplethDict.get(districtKey) : null;

      if (districtData && geoData) {
        // Find the exact feature using normalized key
        const feature = geoData.features.find((f: any) => 
          normalizeGeographicKey(f.properties.district || '') === districtKey
        );
        
        if (feature) {
          const districtName = feature.properties.district || district;
          setHighlightedTarget(districtName);
          setDistrictRef.current(districtName);
          
          let bbox: [number, number, number, number] | undefined;
          if (feature.geometry?.coordinates) {
            bbox = getBBox(feature.geometry.coordinates);
          }

          let latitude = 20.5, longitude = 78.4;
          if (feature.properties?.centroidLat && feature.properties?.centroidLng) {
            latitude = feature.properties.centroidLat;
            longitude = feature.properties.centroidLng;
          } else if (bbox) {
            latitude = (bbox[1] + bbox[3]) / 2;
            longitude = (bbox[0] + bbox[2]) / 2;
          }

          const verticalOffset = 0.15;
          let dynamicZoom = 8.8;
          if (bbox) {
            const dx = bbox[2] - bbox[0];
            const dy = bbox[3] - bbox[1];
            const maxD = Math.max(dx, dy);
            dynamicZoom = Math.min(10.5, Math.max(6.5, 9.8 - Math.log2(maxD / 0.18)));
          }

          setViewState((prev: any) => ({
            ...prev,
            latitude: latitude + verticalOffset + 0.1,
            longitude,
            zoom: dynamicZoom + 0.5,
            pitch: 52,
            bearing: -12,
            transitionDuration: 900,
            transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
          }));
          
          setTimeout(() => {
            setViewState((prev: any) => ({
              ...prev,
              latitude: latitude + verticalOffset,
              longitude,
              zoom: dynamicZoom,
              pitch: 50,
              bearing: -10,
              transitionDuration: 700,
              transitionInterpolator: new FlyToInterpolator({ speed: 1.4 }),
              transitionEasing: (t: number) => 1 - Math.pow(1 - t, 3),
            }));
          }, 900);
          
          setTimeout(() => setHighlightedTarget(null), 3000);
        }
      } else if (!districtData && geoData) {
        // Fallback: Try to find in GeoJSON even if not in choroplethDict
        const normalizedDistrict = normalizeGeographicKey(district);
        const feature = geoData.features.find((f: any) => 
          normalizeGeographicKey(f.properties.district || '') === normalizedDistrict
        );
        
        if (feature) {
          const districtName = feature.properties.district || district;
          setHighlightedTarget(districtName);
          setDistrictRef.current(districtName);
          
          let bbox: [number, number, number, number] | undefined;
          if (feature.geometry?.coordinates) {
            bbox = getBBox(feature.geometry.coordinates);
          }

          let latitude = 20.5, longitude = 78.4;
          if (feature.properties?.centroidLat && feature.properties?.centroidLng) {
            latitude = feature.properties.centroidLat;
            longitude = feature.properties.centroidLng;
          } else if (bbox) {
            latitude = (bbox[1] + bbox[3]) / 2;
            longitude = (bbox[0] + bbox[2]) / 2;
          }

          const verticalOffset = 0.15;
          let dynamicZoom = 8.8;
          if (bbox) {
            const dx = bbox[2] - bbox[0];
            const dy = bbox[3] - bbox[1];
            const maxD = Math.max(dx, dy);
            dynamicZoom = Math.min(10.5, Math.max(6.5, 9.8 - Math.log2(maxD / 0.18)));
          }

          setViewState((prev: any) => ({
            ...prev,
            latitude: latitude + verticalOffset,
            longitude,
            zoom: dynamicZoom,
            pitch: 50,
            bearing: -10,
            transitionDuration: 1200,
            transitionInterpolator: new FlyToInterpolator({ speed: 1.5 }),
          }));
          
          setTimeout(() => setHighlightedTarget(null), 3000);
        }
      }
    }

    if (metric) setActiveMetric(metric as ActiveMetric);
    setSonicFlyTarget(null);
  }, [sonicFlyTarget, geoData, setSonicFlyTarget, choroplethDict, getBBox]);

  // Handle pinning insights
  const handlePinInsight = useCallback((district: string, breachRate: number, patients: number) => {
    const breaches = Math.round((breachRate / 100) * patients);
    const newPin: PinnedInsight = {
      id: `${district}-${Date.now()}`,
      district,
      breachRate,
      patients,
      breaches
    };
    setPinnedInsights(prev => {
      if (prev.some(p => p.district === district)) return prev;
      return [...prev, newPin];
    });
  }, []);

  const handleUnpinInsight = useCallback((id: string) => {
    setPinnedInsights(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleClearAllPins = useCallback(() => {
    setPinnedInsights([]);
  }, []);

  // Handle AI Command Execution from GenieReporter
  const handleAICommand = useCallback((cmd: any) => {
    if (cmd.action === 'reset') {
      setState('');
      setDistrict('');
      setHighlightedTarget(null);
      setViewState({
        longitude: 78.4,
        latitude: 20.5,
        zoom: 5,
        pitch: 55,
        bearing: -15,
        transitionDuration: 2000,
        transitionInterpolator: new FlyToInterpolator()
      });
    } else {
      if (cmd.targetState) {
        setState(cmd.targetState);
      }

      if (cmd.targetDistrict) {
        setDistrict(cmd.targetDistrict);
        setHighlightedTarget(cmd.targetDistrict);
        flyToDistrict(cmd.targetDistrict);
      } else if (cmd.targetState && cmd.action === 'flyTo') {
        setHighlightedTarget(cmd.targetState);
        const stateFeature = geoData?.features.find((f: any) => 
          normalizeGeographicKey(f.properties.st_nm || '') === normalizeGeographicKey(cmd.targetState!)
        );
        if (stateFeature) {
          const coords = stateFeature.geometry.coordinates;
          let avgLon = 78.4, avgLat = 20.5;
          if (stateFeature.geometry.type === 'Polygon') {
            const points = coords[0];
            avgLon = points.reduce((sum: number, p: number[]) => sum + p[0], 0) / points.length;
            avgLat = points.reduce((sum: number, p: number[]) => sum + p[1], 0) / points.length;
          }
          setViewState({
            longitude: avgLon,
            latitude: avgLat,
            zoom: 6.5,
            pitch: 50,
            bearing: -10,
            transitionDuration: 2000,
            transitionInterpolator: new FlyToInterpolator()
          });
        }
      }

      if (cmd.metric) {
        setActiveMetric(cmd.metric);
      }
    }
  }, [setState, setDistrict, flyToDistrict, geoData]);

  // Zoom to Fit: Calculate bounding box from GeoJSON
  const handleZoomToFit = useCallback(() => {
    if (!geoData || !geoData.features || geoData.features.length === 0) return;

    // Calculate bounds from GeoJSON features
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    
    geoData.features.forEach((feature: any) => {
      const coords = feature.geometry.coordinates;
      if (feature.geometry.type === 'Polygon') {
        coords[0].forEach((point: number[]) => {
          minLng = Math.min(minLng, point[0]);
          maxLng = Math.max(maxLng, point[0]);
          minLat = Math.min(minLat, point[1]);
          maxLat = Math.max(maxLat, point[1]);
        });
      }
    });

    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 4;
    if (maxDiff < 1) zoom = 10;
    else if (maxDiff < 3) zoom = 8;
    else if (maxDiff < 5) zoom = 7;
    else if (maxDiff < 10) zoom = 6;
    else zoom = 5;

    setViewState({
      longitude: (minLng + maxLng) / 2,
      latitude: (minLat + maxLat) / 2,
      zoom,
      pitch: 50,
      bearing: 0,
      transitionDuration: 2000,
      transitionInterpolator: new FlyToInterpolator()
    });
  }, [geoData]);

  const handleDistrictSelect = useCallback((district: string) => {
    flyToDistrict(district);
  }, [flyToDistrict]);

  if (!isClient || !webGLSupported) {
    return (
      <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">
            {webGLError ? 'WebGL Error' : 'Loading 3D Visualization...'}
          </div>
          <div className="text-slate-400">
            {webGLError || 'Initializing WebGL Engine'}
          </div>
          {webGLError && (
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
            >
              Reload Page
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <CommandCenterLayout
      filteredPatients={filteredPatients}
      globalPatients={globalPatients}
      uniqueCoordinators={uniqueCoordinators}
      onZoomToFit={handleZoomToFit}
      onShowCascade={() => setShowCascade(!showCascade)}
      onShowLeaderboard={() => setShowLeaderboard(!showLeaderboard)}
      showCascade={showCascade}
      showLeaderboard={showLeaderboard}
      heatmapMode={heatmapMode}
      onHeatmapModeChange={setHeatmapMode}
      choroplethDict={choroplethDict}
      choroplethData={geoChoroplethData}
      activeMetric={activeMetric}
    >
      <div className="relative w-full h-full overflow-hidden bg-slate-900 pb-24" 
        style={{ cursor: isLensActive ? 'none' : 'default' }}
        onMouseMove={(e) => {
          if (isLensActive) {
            updateMousePosition(e.clientX, e.clientY);
          }
        }}
      >
        <div className="absolute inset-0 bg-slate-950">
          <DeckGL
            ref={deckRef}
            viewState={viewState}
            controller={{ touchRotate: true, touchZoom: true, dragRotate: true, scrollZoom: true, keyboard: true }}
            layers={layers}
            effects={[lightingEffect]}
            onViewStateChange={(e: any) => setViewState(e.viewState)}
            style={{ width: '100%', height: '100%' }}
            onWebGLInitialized={(gl: any) => {
              try {
                if (gl && gl.getParameter) {
                  // Enable depth testing
                  gl.enable(gl.DEPTH_TEST);
                  gl.depthFunc(gl.LEQUAL);
                  
                  // Enable blending
                  gl.enable(gl.BLEND);
                  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                  
                  // Check for WebGL2 features
                  const isWebGL2 = gl instanceof WebGL2RenderingContext;
                  if (!isWebGL2) {
                    console.warn('WebGL2 not available, some features may be limited');
                  }
                }
              } catch (error) {
                console.error('WebGL initialization error:', error);
                setWebGLError('WebGL initialization failed');
                setWebGLSupported(false);
              }
            }}
            onError={(error: any) => {
              console.error('DeckGL error:', error);
              setWebGLError(error?.message || 'Rendering error');
            }}
          >
            <Map 
              reuseMaps 
              mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
              onLoad={(e) => {
                mapRef.current = e.target;
                setMapInstance(e.target);
              }}
            />
          </DeckGL>

          {/* Loading overlay for GeoJSON */}
          {!geoData && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-10">
              <div className="text-center">
                <div className="text-lg font-bold text-white mb-2">Loading GeoJSON...</div>
                <div className="text-slate-400 text-sm">Fetching map data</div>
              </div>
            </div>
          )}
        </div>

        {/* Depth Segmented Control */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
          <DepthSegmentedControl
            value={heatmapMode}
            onChange={setHeatmapMode}
          />
        </div>

        {/* Cascade Funnel Panel */}
        <AnimatePresence>
          {showCascade && (
            <CascadeFunnelPanel
              filteredPatients={filteredPatients}
              onClose={() => setShowCascade(false)}
            />
          )}
        </AnimatePresence>

        {/* District Leaderboard */}
        <AnimatePresence>
          {showLeaderboard && (
            <DistrictLeaderboard
              filteredPatients={filteredPatients}
              onDistrictSelect={handleDistrictSelect}
              onClose={() => setShowLeaderboard(false)}
            />
          )}
        </AnimatePresence>

        {/* Magic Lens Tooltip */}
        <MagicLensTooltip
          isActive={isLensActive}
          mouseXRef={mouseXRef}
          mouseYRef={mouseYRef}
          hoveredDistrict={hoveredDistrict}
        />

        {/* Magic Lens Debug Indicator */}
        {isLensActive && (
          <div className="fixed top-4 right-4 z-[99999] bg-[#111] border border-[#333] px-3 py-1.5 rounded-sm text-[#888] text-[9px] font-mono tracking-widest animate-pulse">
            <span className="text-emerald-500 font-bold">LENS</span> ACTIVE
          </div>
        )}

        {/* Pinned Insights */}
        <AnimatePresence>
          {pinnedInsights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute top-6 left-6 z-40 space-y-2 max-w-[240px]"
            >
            {pinnedInsights.map((pin, index) => (
              <motion.div
                key={pin.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#111111]/95 backdrop-blur-xl border border-[#333] rounded-sm p-3 shadow-lg"
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#222]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-sm" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white">{pin.district}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                      pin.breachRate > 80 ? 'bg-red-500/20 text-red-500' :
                      pin.breachRate > 60 ? 'bg-orange-500/20 text-orange-500' :
                      pin.breachRate > 40 ? 'bg-amber-500/20 text-amber-500' :
                      'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      {pin.breachRate.toFixed(0)}%
                    </span>
                    <button
                      onClick={() => handleUnpinInsight(pin.id)}
                      className="text-[#555] hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-[9px] font-mono tracking-wide">
                  <div className="flex justify-between">
                    <span className="text-[#666]">VOL:</span>
                    <span className="text-[#ccc]">{pin.patients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">ERR:</span>
                    <span className="text-red-500 font-bold">{pin.breaches}</span>
                  </div>
                </div>
                <button
                  onClick={() => flyToDistrict(pin.district)}
                  className="mt-2 w-full bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-[#888] text-[9px] uppercase font-bold tracking-widest py-1.5 rounded-sm transition-all text-center"
                >
                  TARGET_LOC
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live HUD - Hover Tooltip */}
        <AnimatePresence>
        {hoveredHUD && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'absolute', left: hoveredHUD.x + 20, top: hoveredHUD.y - 80 }}
            className="z-50"
          >
            <div className="bg-[#111111]/95 backdrop-blur-xl border border-[#333] rounded-sm p-3 shadow-2xl min-w-[220px]" style={{ pointerEvents: 'auto' }}>
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#222]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-white tracking-widest uppercase">{hoveredHUD.district}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                    hoveredHUD.breachRate > 80 ? 'bg-red-500/20 text-red-500' :
                    hoveredHUD.breachRate > 60 ? 'bg-orange-500/20 text-orange-500' :
                    hoveredHUD.breachRate > 40 ? 'bg-amber-500/20 text-amber-500' :
                    'bg-emerald-500/20 text-emerald-500'
                  }`}>
                    {hoveredHUD.breachRate.toFixed(0)}%
                  </span>
                  <button
                    onClick={() => handlePinInsight(hoveredHUD.district, hoveredHUD.breachRate, hoveredHUD.patients)}
                    className="text-[#666] hover:text-amber-500 transition-colors"
                  >
                    <Pin className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-[9px] font-mono tracking-wide capitalize-none">
                <div className="flex justify-between">
                  <span className="text-[#666]">VOL:</span>
                  <span className="text-[#ccc]">{hoveredHUD.patients}</span>
                </div>
                {hoveredHUD.yieldPercent !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">YLD:</span>
                    <span className="text-cyan-500">{hoveredHUD.yieldPercent.toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-[#161616] mt-1 p-1 rounded-[1px] border border-[#222]">
                  <span className="text-[#666] uppercase">SLA:</span>
                  <span className={`font-bold ${
                    hoveredHUD.breachRate > 80 ? 'text-red-500' : 'text-emerald-500'
                  }`}>
                    {hoveredHUD.breachRate > 80 ? '⚠ ' + hoveredHUD.breachRate.toFixed(0) + '% BREACH' : '✓ TRACKED'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* District Filter Badge */}
      <AnimatePresence>
        {(filter.district || treeFilter?.district) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="backdrop-blur-xl bg-cyan-900/80 border border-cyan-500/50 rounded-xl px-5 py-2.5 text-sm text-cyan-100 shadow-lg shadow-cyan-500/20 font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Viewing: {filter.district || treeFilter?.district}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </CommandCenterLayout>
  );
});

