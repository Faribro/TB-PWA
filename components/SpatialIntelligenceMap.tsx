'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import dynamic from 'next/dynamic';
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

type ActiveMetric = 'screened' | 'diagnosed' | 'initiated' | 'completed' | 'breaches';

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
  const [showCascade, setShowCascade] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<'auto' | 'state' | 'district' | 'facility'>('district');
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>('screened');
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
  const activeGISMetric = useEntityStore(s => s.activeGISMetric);
  const showGISLeaderboard = useEntityStore(s => s.showGISLeaderboard);
  const showGISCascade = useEntityStore(s => s.showGISCascade);
  const sonicFlyTarget = useEntityStore(s => s.sonicFlyTarget);
  const setSonicFlyTarget = useEntityStore(s => s.setSonicFlyTarget);
  const setActiveGISMetric = useEntityStore(s => s.setActiveGISMetric);
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

  // Apply filters to patients with normalized geographic matching
  const filteredPatients = useMemo(() => {
    let filtered = globalPatients;
    
    // Apply tree filter district
    if (treeFilter?.district) {
      filtered = filtered.filter(p => 
        normalizeGeographicKey(p.screening_district) === normalizeGeographicKey(treeFilter.district)
      );
    }
    
    // Apply universal filter state (state-wide filtering)
    if (filter.state) {
      filtered = filtered.filter(p => 
        normalizeGeographicKey(p.screening_state) === normalizeGeographicKey(filter.state)
      );
    }
    
    // Apply universal filter district (district-level filtering)
    if (filter.district) {
      filtered = filtered.filter(p => 
        normalizeGeographicKey(p.screening_district) === normalizeGeographicKey(filter.district)
      );
    }
    
    return filtered;
  }, [globalPatients, treeFilter, filter.state, filter.district]);

  // Map patients: Show all patients in selected state, or all data if no state filter
  // This ensures the map displays complete state-wide data for visualization
  const mapPatients = useMemo(() => {
    let basePatients = globalPatients;

    // Apply temporal filtering if actively playing or in historical mode
    if (isTemporalMode) {
      basePatients = basePatients.filter(p => {
        const dateValue = p.screening_date;
        if (!dateValue) return false;
        const pDate = new Date(dateValue).getTime();
        return pDate <= currentPlayhead;
      });
    }

    // If state filter is active, show all patients in that state
    if (filter.state) {
      return basePatients.filter(p => 
        normalizeGeographicKey(p.screening_state) === normalizeGeographicKey(filter.state!)
      );
    }
    
    // If district filter is active, show all patients (to keep other districts visible)
    // The highlighting will show which district is selected
    if (filter.district) {
      return basePatients;
    }
    
    // No filters: show all patients
    return basePatients;
  }, [globalPatients, filter.state, filter.district, isTemporalMode, currentPlayhead]);

  // Determine depth level based on heatmap mode
  const depthLevel = useMemo(() => {
    if (heatmapMode === 'auto') {
      const zoom = viewState.zoom;
      if (zoom < 5.5) return 'state';
      return 'district';
    }
    return heatmapMode === 'state' ? 'state' : 'district';
  }, [heatmapMode, viewState.zoom]);

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
            const geojson = feature(topology, topology.objects[objectKey]);
            return geojson.features;
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

  // Build O(n) aggregation dictionary using mapPatients (not filteredPatients)
  // This ensures the map shows all districts even when one is selected
  const choroplethDict = useChoroplethDictionary(mapPatients, depthLevel);

  // Match cities to TB data with geography matching
  const enrichedCities = useMemo(() => {
    return citiesData
      .filter(city => city.lat && city.lng)
      .map(city => {
        const key = normalizeGeographicKey(city.city);
        const metrics = choroplethDict.get(key);
        return {
          ...city,
          tbCases: metrics?.screened || 0,
          position: [parseFloat(city.lng), parseFloat(city.lat)],
          population: parseInt(city.population) || 0
        };
      })
      .filter(city => city.tbCases > 0);
  }, [citiesData, choroplethDict]);

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

    const value = metrics[metric];
    const percentage = (value / metrics.screened) * 100;
    const yieldPercent = metrics.screened > 0 ? (metrics.diagnosed / metrics.screened) * 100 : 0;
    const breachPercent = metrics.screened > 0 ? (metrics.breaches / metrics.screened) * 100 : 0;

    // Breach metric: Red scale (high = bad) - Legend-aligned
    if (metric === 'breaches') {
      if (breachPercent > 90) return [153, 27, 27, 255];   // SLA Breach (>90%) - Deep pulse red
      if (breachPercent > 70) return [239, 68, 68, 220];   // Critical Tier (>70%) - Red
      if (breachPercent >= 40) return [245, 158, 11, 200]; // Warning Tier (40-60%) - Amber
      if (breachPercent < 20 || yieldPercent > 15) return [16, 185, 129, 220]; // High Yield / On Track - Emerald
      return [100, 116, 139, 160];                         // Neutral - Slate
    }

    // Screened metric: Volume-based Cyan/Indigo scale
    if (metric === 'screened') {
      const maxScreened = 500; // Adjust based on your data range
      const intensity = Math.min(value / maxScreened, 1);
      
      if (intensity > 0.8) return [79, 70, 229, 220];    // Deep indigo (very high volume)
      if (intensity > 0.6) return [99, 102, 241, 200];   // Indigo
      if (intensity > 0.4) return [129, 140, 248, 180];  // Light indigo
      if (intensity > 0.2) return [6, 182, 212, 160];    // Cyan
      return [14, 165, 233, 140];                        // Sky blue (low volume)
    }

    // Diagnosed/Initiated/Completed: Yield-based Emerald/Cyan scale (high = good)
    if (percentage > 80) return [16, 185, 129, 220];   // Dark emerald (excellent)
    if (percentage > 60) return [34, 197, 94, 200];    // Emerald (good)
    if (percentage > 40) return [6, 182, 212, 180];    // Cyan (moderate)
    if (percentage > 20) return [14, 165, 233, 160];   // Sky (low)
    return [100, 116, 139, 140];                       // Slate (very low)
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
    const metrics = choroplethDict.get(key);
    
    // Find feature from GeoJSON
    const feature = geoData?.features.find((f: any) => 
      normalizeGeographicKey(f.properties.district || f.properties.st_nm || '') === key
    );
    
    if (feature) {
      let latitude = 20.5, longitude = 78.4;
      let bbox: [number, number, number, number] | undefined;

      // Calculate BBox
      if (feature.geometry?.coordinates) {
        bbox = getBBox(feature.geometry.coordinates);
      }
      
      // Use centroid if available, else center of bbox
      if (feature.properties?.centroidLat && feature.properties?.centroidLng) {
        latitude = feature.properties.centroidLat;
        longitude = feature.properties.centroidLng;
      } else if (bbox) {
        latitude = (bbox[1] + bbox[3]) / 2;
        longitude = (bbox[0] + bbox[2]) / 2;
      }
      
      flyToDistrictInTwoSteps({ lat: latitude, lng: longitude, district, bbox });
    }
  }, [choroplethDict, geoData, flyToDistrictInTwoSteps]);

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
        getElevation: (d: any) => {
          const name = d.properties.district || d.properties.st_nm || '';
          const key = normalizeGeographicKey(name);
          const metrics = choroplethDict.get(key);
          if (!metrics) {
            return 1000;
          }
          const value = metrics[activeMetric];
          return Math.max(value * 150, 1000);
        },
        getFillColor: (d: any, { index }: { index: number }) => {
          // Fallback for multiple GeoJSON property name conventions
          const districtName = d.properties.district || d.properties.NAME_2 || d.properties.dtname || '';
          const stateName = d.properties.st_nm || d.properties.NAME_1 || d.properties.state || '';
          const key = normalizeGeographicKey(districtName);
          const metrics = choroplethDict.get(key);
          const isHovered = hoveredHUD?.district === districtName;
          
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
          getFillColor: [activeMetric, choroplethDict, hoveredHUD, filter.state, filter.district, highlightedTarget, isTemporalMode, currentPlayhead],
          getElevation: [activeMetric, choroplethDict, isTemporalMode, currentPlayhead],
          getLineColor: [filter.state, filter.district, highlightedTarget, isTemporalMode, currentPlayhead],
          getLineWidth: [filter.state, filter.district, isTemporalMode, currentPlayhead]
        },
        transitions: {
          getFillColor: { duration: 400, easing: t => t * (2 - t) },
          getElevation: { duration: 600, type: 'spring' }
        },
        onClick: (info: any) => {
          if (info.object) {
            const districtName = info.object.properties.district || info.object.properties.NAME_2 || info.object.properties.dtname;
            
            // Magic Lens Neural Link: If lens is active, trigger Sonic deep scan
            if (isLensActive && districtName) {
              const key = normalizeGeographicKey(districtName);
              const metrics = choroplethDict.get(key);
              
              if (metrics) {
                // Dispatch to Sonic for deep scan
                setSonicDeepScanTarget(districtName);
                setSonicDeepScanData({
                  district: districtName,
                  screened: metrics.screened,
                  breaches: metrics.breaches,
                  breachRate: metrics.screened > 0 ? (metrics.breaches / metrics.screened) * 100 : 0,
                });
                
                // Highlight the district on map
                setSonicFlyTarget({ district: districtName });
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
              const districtName = info.object.properties.district || info.object.properties.NAME_2 || info.object.properties.dtname;
              const key = normalizeGeographicKey(districtName || '');
              const metrics = choroplethDict.get(key);
              
              if (metrics) {
                updateHoveredDistrict({
                  properties: {
                    district: districtName,
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
            const districtName = info.object.properties.district || info.object.properties.NAME_2 || info.object.properties.dtname;
            const key = normalizeGeographicKey(districtName || '');
            const metrics = choroplethDict.get(key);
            
            if (metrics) {
              const breachRate = metrics.screened > 0 ? (metrics.breaches / metrics.screened) * 100 : 0;
              const yieldPercent = metrics.screened > 0 ? (metrics.diagnosed / metrics.screened) * 100 : 0;
              setHoveredHUD({
                district: districtName,
                breachRate,
                patients: metrics.screened,
                yieldPercent,
                x: info.x,
                y: info.y
              });
            } else if (districtName) {
              setHoveredHUD({
                district: districtName,
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
  }, [isClient, webGLSupported, geoData, choroplethDict, activeMetric, getColorFromMetric, setDistrict, filter.state, filter.district, hoveredHUD, flyToDistrict]);

  // City Pillars Layer (Glowing Columns)
  const cityPillarsLayer = useMemo(() => {
    if (!isClient || !webGLSupported || enrichedCities.length === 0) return null;

    return new ColumnLayer({
      id: 'city-pillars-layer',
      data: enrichedCities,
      pickable: true,
      extruded: true,
      diskResolution: 12,
      radius: 8000,
      material: {
        ambient: 0.2,
        diffuse: 0.8,
        shininess: 40,
        specularColor: [100, 100, 255]
      },
      getPosition: (d: any) => d.position,
      getElevation: (d: any) => {
        const baseHeight = d.tbCases * 200;
        const isInHoveredDistrict = hoveredHUD && 
          normalizeGeographicKey(d.city) === normalizeGeographicKey(hoveredHUD.district);
        return isInHoveredDistrict ? baseHeight * 1.5 : baseHeight;
      },
      getFillColor: (d: any) => {
        const isInHoveredDistrict = hoveredHUD && 
          normalizeGeographicKey(d.city) === normalizeGeographicKey(hoveredHUD.district);
        
        if (isInHoveredDistrict) {
          return [100, 200, 255, 255];
        }
        
        // If breaches is active (either via panel or global metric)
        const isBreachView = activeMetric === 'breaches' || activeGISMetric === 'breaches';
        const intensity = Math.min(d.tbCases / 150, 1);

        if (isBreachView) {
          // High-visibility red gradient for breaches
          return [
            255,
            Math.max(20, 100 * (1 - intensity)),
            Math.max(20, 100 * (1 - intensity)),
            230
          ];
        }

        // Default blue-cyan gradient for other metrics
        return [
          Math.max(20, 255 * (1 - intensity)),
          200,
          255,
          220
        ];
      },
      updateTriggers: {
        getElevation: [hoveredHUD, activeMetric, activeGISMetric],
        getFillColor: [hoveredHUD, activeMetric, activeGISMetric]
      }
    });
  }, [isClient, webGLSupported, enrichedCities, hoveredHUD, activeMetric, activeGISMetric]);

  // City Pillars Text Layer (Numbers on top of Columns)
  const cityPillarsTextLayer = useMemo(() => {
    if (!isClient || !webGLSupported || enrichedCities.length === 0) return null;

    return new TextLayer({
      id: 'city-pillars-text-layer',
      data: enrichedCities,
      getPosition: (d: any) => {
        const baseHeight = d.tbCases * 200;
        const isInHoveredDistrict = hoveredHUD && 
          normalizeGeographicKey(d.city) === normalizeGeographicKey(hoveredHUD.district);
        const z = isInHoveredDistrict ? baseHeight * 1.5 : baseHeight;
        return [d.position[0], d.position[1], z + 5000]; // Shift up slightly above the pillar
      },
      getText: (d: any) => `${d.tbCases === 0 ? '' : d.tbCases}`, // Don't show 0
      getSize: 32000, // Increased size for visibility
      sizeUnits: 'meters',
      getColor: [255, 255, 255, 255],
      getAlignmentBaseline: 'bottom',
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 'bold',
      outlineColor: [0, 0, 0, 180],
      outlineWidth: 2,
      billboard: true, // Always face camera
      updateTriggers: {
        getPosition: [hoveredHUD, activeMetric, activeGISMetric],
        getText: [activeMetric, activeGISMetric]
      },
      transitions: {
        getPosition: { duration: 600, type: 'spring' }
      }
    });
  }, [isClient, webGLSupported, enrichedCities, hoveredHUD]);

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

  // Performance guardrail: Memoized layers array
  const layers = useMemo(() => {
    const layerList = [];
    if (choroplethLayer) layerList.push(choroplethLayer);
    if (cityPillarsLayer) layerList.push(cityPillarsLayer);
    if (cityPillarsTextLayer) layerList.push(cityPillarsTextLayer);
    return layerList;
  }, [choroplethLayer, cityPillarsLayer, cityPillarsTextLayer]);

  // Handle district filter with smooth flyTo transition
  useEffect(() => {
    const activeDistrict = filter.district || treeFilter?.district;
    if (activeDistrict) {
      flyToDistrict(activeDistrict);
    } else {
      setViewState({
        longitude: 78.4,
        latitude: 20.5,
        zoom: 4.5,
        pitch: 55,
        bearing: -15,
        transitionDuration: 1500,
        transitionInterpolator: new FlyToInterpolator()
      });
    }
  }, [filter.district, treeFilter?.district, flyToDistrict]);

  // ── Sonic metric switch ──────────────────────────────────────────
  useEffect(() => {
    if (!activeGISMetric) return;
    setActiveMetric(activeGISMetric as ActiveMetric);
    setActiveGISMetric('');
  }, [activeGISMetric, setActiveGISMetric]);

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
      
      const districtKey = choroplethDict.has(normalizedDistrict) 
        ? normalizedDistrict
        : Array.from(choroplethDict.keys()).find(k => 
            k.includes(normalizedDistrict) || normalizedDistrict.includes(k)
          );
      
      const districtData = districtKey ? choroplethDict.get(districtKey) : null;

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
          <div className="text-2xl font-bold text-white mb-2">Loading 3D Visualization...</div>
          <div className="text-slate-400">Initializing WebGL Engine</div>
        </div>
      </div>
    );
  }

  return (
    <CommandCenterLayout
      filteredPatients={filteredPatients}
      uniqueCoordinators={uniqueCoordinators}
      onZoomToFit={handleZoomToFit}
      onShowCascade={() => setShowCascade(!showCascade)}
      onShowLeaderboard={() => setShowLeaderboard(!showLeaderboard)}
      showCascade={showCascade}
      showLeaderboard={showLeaderboard}
      heatmapMode={heatmapMode}
      onHeatmapModeChange={setHeatmapMode}
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
                  gl.enable(gl.DEPTH_TEST);
                  gl.depthFunc(gl.LEQUAL);
                }
              } catch (error) {
                console.error('WebGL initialization error:', error);
                setWebGLSupported(false);
              }
            }}
            onError={(error: any) => {
              console.error('DeckGL error:', error);
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

        {/* KPI Metric Selector */}
        <MapKPIOverlay
          activeMetric={activeMetric}
          onMetricChange={setActiveMetric}
        />

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
          <div className="fixed top-4 right-4 z-[99999] bg-cyan-500/90 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg shadow-cyan-500/50 animate-pulse">
            🔍 Magic Lens Active
          </div>
        )}

        {/* Pinned Insights */}
        <AnimatePresence>
          {pinnedInsights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute top-6 left-6 z-40 space-y-3 max-w-[280px]"
            >
            {pinnedInsights.map((pin, index) => (
              <motion.div
                key={pin.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-950/95 backdrop-blur-xl border-2 border-amber-400/60 rounded-xl p-4 shadow-2xl shadow-amber-500/20"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">{pin.district}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      pin.breachRate > 80 ? 'bg-red-500/30 text-red-300' :
                      pin.breachRate > 60 ? 'bg-orange-500/30 text-orange-300' :
                      pin.breachRate > 40 ? 'bg-amber-500/30 text-amber-300' :
                      'bg-emerald-500/30 text-emerald-300'
                    }`}>
                      {pin.breachRate.toFixed(0)}%
                    </span>
                    <button
                      onClick={() => handleUnpinInsight(pin.id)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Patients:</span>
                    <span className="text-white font-semibold">{pin.patients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Breaches:</span>
                    <span className="text-red-400 font-semibold">{pin.breaches}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">SLA Status:</span>
                    <span className={`font-bold ${
                      pin.breachRate > 80 ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {pin.breachRate > 80 ? '⚠️ High Risk' : '✓ On Track'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => flyToDistrict(pin.district)}
                  className="mt-3 w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Fly to Location
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
            <div className="bg-slate-950/95 backdrop-blur-xl border-2 border-cyan-400/60 rounded-xl p-4 shadow-2xl shadow-cyan-500/30 min-w-[280px]" style={{ pointerEvents: 'auto' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">{hoveredHUD.district}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    hoveredHUD.breachRate > 80 ? 'bg-red-500/30 text-red-300' :
                    hoveredHUD.breachRate > 60 ? 'bg-orange-500/30 text-orange-300' :
                    hoveredHUD.breachRate > 40 ? 'bg-amber-500/30 text-amber-300' :
                    'bg-emerald-500/30 text-emerald-300'
                  }`}>
                    {hoveredHUD.breachRate.toFixed(0)}%
                  </span>
                  <button
                    onClick={() => handlePinInsight(hoveredHUD.district, hoveredHUD.breachRate, hoveredHUD.patients)}
                    className="text-amber-400 hover:text-amber-300 transition-colors"
                    title="Pin this insight"
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Patients:</span>
                  <span className="text-white font-semibold">{hoveredHUD.patients}</span>
                </div>
                {hoveredHUD.yieldPercent !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Yield:</span>
                    <span className="text-cyan-400 font-semibold">{hoveredHUD.yieldPercent.toFixed(1)}%</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">SLA Status:</span>
                  <span className={`font-bold ${
                    hoveredHUD.breachRate > 80 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {hoveredHUD.breachRate > 80 ? '⚠️ ' + hoveredHUD.breachRate.toFixed(0) + '% Breach' : '✓ On Track'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => flyToDistrict(hoveredHUD.district)}
                className="mt-3 w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Activity className="w-3.5 h-3.5" />
                Teleport to Pipeline
              </button>
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
