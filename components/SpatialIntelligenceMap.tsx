'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import dynamic from 'next/dynamic';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import { GeoJsonLayer, ScatterplotLayer, ColumnLayer, TextLayer } from '@deck.gl/layers';
import { LightingEffect, AmbientLight, PointLight } from '@deck.gl/core';
import Map from 'react-map-gl/maplibre';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, AlertTriangle, TrendingUp, Activity, X, Search, BarChart3, Trophy, Layers, Globe, Building2, MapPinned, Hospital, Pin, Maximize2 } from 'lucide-react';
import { useTreeFilter } from '@/contexts/TreeFilterContext';
import { useUniversalFilter } from '@/contexts/FilterContext';
import { FlyToInterpolator } from '@deck.gl/core';
import { MapKPIOverlay } from './MapKPIOverlay';
import { CommandCenterLayout } from './CommandCenterLayout';
import { CascadeFunnelPanel } from './CascadeFunnelPanel';
import { DistrictLeaderboard } from './DistrictLeaderboard';
import { DepthSegmentedControl } from './DepthSegmentedControl';
import { useRolePermissions } from '@/hooks/useRolePermissions';

const DeckGL = dynamic(() => import('@deck.gl/react').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-950" />
});

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
  screening_latitude?: number;
  screening_longitude?: number;
  screening_district: string;
  screening_state: string;
  referral_date: string | null;
  tb_diagnosed: string | null;
  att_start_date: string | null;
  screening_date: string;
  facility_name?: string;
  staff_name?: string;
}

interface TooltipData {
  totalPatients: number;
  slaBreaches: number;
  clusterName: string;
  primaryCoordinator: string;
  breachPercentage: number;
}

interface SpatialIntelligenceMapProps {
  globalPatients?: Patient[];
}

export default memo(function SpatialIntelligenceMap({ globalPatients = [] }: SpatialIntelligenceMapProps) {
  const { filter: treeFilter } = useTreeFilter();
  const { filter, setCoordinator, setStatus, setDistrict } = useUniversalFilter();
  const [viewState, setViewState] = useState<any>({
    longitude: 78.4,
    latitude: 20.5,
    zoom: 5,
    pitch: 55,
    bearing: -15
  });
  const [hoveredTooltip, setHoveredTooltip] = useState<TooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(false);
  const [showCascade, setShowCascade] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<'auto' | 'state' | 'district' | 'facility'>('state');
  const [visualizationType, setVisualizationType] = useState<'hexagon' | 'bar' | 'both'>('both');
  const [hoveredHUD, setHoveredHUD] = useState<{ district: string; breachRate: number; patients: number; yieldPercent?: number; x: number; y: number } | null>(null);
  const [pinnedInsights, setPinnedInsights] = useState<PinnedInsight[]>([]);
  const [districtGeoJson, setDistrictGeoJson] = useState<any>(null);
  const deckRef = useRef<any>(null);
  const permissions = useRolePermissions();

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

    // Load district GeoJSON
    fetch('/india-districts.json')
      .then(res => res.json())
      .then(data => setDistrictGeoJson(data))
      .catch(err => console.error('Failed to load district GeoJSON:', err));
  }, []);

  // Use real Supabase coordinates
  const dynamicOperationalData = useMemo(() => {
    const sanitized = globalPatients.filter(p => 
      typeof p.screening_latitude === 'number' && 
      typeof p.screening_longitude === 'number' &&
      !isNaN(p.screening_latitude) && 
      !isNaN(p.screening_longitude)
    );

    const activeStates = [...new Set(sanitized.map(p => p.screening_state))].filter(Boolean);
    const activeDistricts = [...new Set(sanitized.map(p => p.screening_district))].filter(Boolean);
    
    console.log('🎯 Data:', { total: globalPatients.length, valid: sanitized.length, states: activeStates, districts: activeDistricts.length });
    
    return { patients: sanitized, activeStates, activeDistricts };
  }, [globalPatients]);

  const processedPatients = useMemo(() => dynamicOperationalData.patients, [dynamicOperationalData.patients]);
  const dataBounds = useMemo(() => {
    if (processedPatients.length === 0) return null;
    
    const lats = processedPatients.map(p => p.screening_latitude!);
    const lngs = processedPatients.map(p => p.screening_longitude!);
    
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
      centerLat: (Math.min(...lats) + Math.max(...lats)) / 2,
      centerLng: (Math.min(...lngs) + Math.max(...lngs)) / 2
    };
  }, [processedPatients]);

  // Task 3: Auto-Fit Viewport on Load
  useEffect(() => {
    if (dataBounds && isClient && processedPatients.length > 0) {
      const latDiff = dataBounds.maxLat - dataBounds.minLat;
      const lngDiff = dataBounds.maxLng - dataBounds.minLng;
      const maxDiff = Math.max(latDiff, lngDiff);
      
      let zoom = 5;
      if (maxDiff < 1) zoom = 10;
      else if (maxDiff < 2) zoom = 9;
      else if (maxDiff < 3) zoom = 8;
      else if (maxDiff < 5) zoom = 7;
      else if (maxDiff < 8) zoom = 6;
      
      console.log('🎯 Auto-fitting viewport:', { 
        center: [dataBounds.centerLng, dataBounds.centerLat], 
        zoom,
        patients: processedPatients.length 
      });
      
      setViewState({
        longitude: dataBounds.centerLng,
        latitude: dataBounds.centerLat,
        zoom,
        pitch: 55,
        bearing: -15,
        transitionDuration: 1500,
        transitionInterpolator: new FlyToInterpolator()
      });
    }
  }, [dataBounds, isClient, processedPatients.length]);

  // Extract unique coordinators
  const uniqueCoordinators = useMemo(() => {
    const coordinators = new Set<string>();
    processedPatients.forEach(p => {
      if (p.staff_name) coordinators.add(p.staff_name);
    });
    return Array.from(coordinators).sort();
  }, [processedPatients]);

  // Calculate SLA breach status
  const isSLABreach = useCallback((patient: Patient): boolean => {
    const screeningDate = patient.screening_date ? new Date(patient.screening_date) : null;
    if (!screeningDate) return false;
    const daysSince = (Date.now() - screeningDate.getTime()) / (1000 * 60 * 60 * 24);
    return !patient.referral_date && daysSince > 7;
  }, []);

  // Filter patients with valid coordinates
  const validPatients = useMemo(() => {
    return processedPatients.filter(p => 
      p.screening_latitude && 
      p.screening_longitude && 
      typeof p.screening_latitude === 'number' && 
      typeof p.screening_longitude === 'number'
    );
  }, [processedPatients]);

  // Data Integrity Check: Log Maharashtra stats
  useEffect(() => {
    const mhPatients = globalPatients.filter(p => p.screening_state === 'Maharashtra');
    const mhWithCoords = validPatients.filter(p => p.screening_state === 'Maharashtra');
    console.log('🔍 Maharashtra Data Integrity Check:');
    console.log('  Total MH Patients:', mhPatients.length);
    console.log('  MH Patients with valid coordinates:', mhWithCoords.length);
    console.log('  Coverage:', mhWithCoords.length > 0 ? `${((mhWithCoords.length / mhPatients.length) * 100).toFixed(1)}%` : '0%');
  }, [globalPatients, validPatients]);

  // Adaptive Zoom: Bird's Eye View on load, flyTo facility when coordinator selected
  useEffect(() => {
    if (filter.coordinator) {
      const coordinatorPatients = validPatients.filter(p => p.staff_name === filter.coordinator);
      if (coordinatorPatients.length > 0) {
        const avgLat = coordinatorPatients.reduce((sum, p) => sum + (p.screening_latitude || 0), 0) / coordinatorPatients.length;
        const avgLon = coordinatorPatients.reduce((sum, p) => sum + (p.screening_longitude || 0), 0) / coordinatorPatients.length;
        setViewState({
          longitude: avgLon,
          latitude: avgLat,
          zoom: 11,
          pitch: 60,
          bearing: -15,
          transitionDuration: 2000,
          transitionInterpolator: new FlyToInterpolator()
        });
      }
    }
  }, [filter.coordinator, validPatients]);

  // Apply Live Tactical Filter - Using Universal Filter Context
  const filteredMapData = useMemo(() => {
    let filtered = validPatients;

    // Filter by coordinator
    if (filter.coordinator) {
      filtered = filtered.filter(p => p.staff_name === filter.coordinator);
    }

    // Filter by status
    if (filter.status === 'High Alert') {
      filtered = filtered.filter(p => isSLABreach(p));
    } else if (filter.status === 'On Track') {
      filtered = filtered.filter(p => !isSLABreach(p));
    }

    return filtered;
  }, [validPatients, filter.coordinator, filter.status, isSLABreach]);

  // Apply tree filter and universal filter to patients
  const finalFilteredPatients = useMemo(() => {
    let filtered = filteredMapData;
    
    // Apply tree filter district
    if (treeFilter?.district) {
      filtered = filtered.filter(p => p.screening_district === treeFilter.district);
    }
    
    // Apply universal filter district
    if (filter.district) {
      filtered = filtered.filter(p => p.screening_district === filter.district);
    }
    
    return filtered;
  }, [filteredMapData, treeFilter, filter.district]);

  // Prepare data for hexagon layer with intelligent jitter for anti-collision
  const hexagonData = useMemo(() => {
    return finalFilteredPatients.map(p => {
      // Apply tiny jitter to prevent exact coordinate overlap (anti-collision)
      const jitterLng = (Math.random() - 0.5) * 0.01;
      const jitterLat = (Math.random() - 0.5) * 0.01;
      
      return {
        position: [
          (p.screening_longitude || 0) + jitterLng,
          (p.screening_latitude || 0) + jitterLat
        ] as [number, number],
        patient: p,
        isBreach: isSLABreach(p)
      };
    });
  }, [finalFilteredPatients, isSLABreach]);

  // Determine visualization depth based on zoom level
  const visualizationDepth = useMemo(() => {
    if (heatmapMode !== 'auto') return heatmapMode;
    const zoom = viewState.zoom;
    if (zoom < 5.5) return 'state';
    if (zoom < 7.5) return 'district';
    return 'facility';
  }, [viewState.zoom, heatmapMode]);

  // Aggregate data by state
  const stateAggregatedData = useMemo(() => {
    if (finalFilteredPatients.length === 0) return [];
    
    const stateMap: Record<string, Patient[]> = {};
    finalFilteredPatients.forEach(p => {
      const state = p.screening_state || 'Unknown';
      if (!stateMap[state]) stateMap[state] = [];
      stateMap[state].push(p);
    });

    const result: any[] = [];
    Object.entries(stateMap).forEach(([state, patients]) => {
      if (patients.length === 0) return;
      const avgLat = patients.reduce((sum, p) => sum + (p.screening_latitude || 0), 0) / patients.length;
      const avgLng = patients.reduce((sum, p) => sum + (p.screening_longitude || 0), 0) / patients.length;
      const breachCount = patients.filter(isSLABreach).length;
      result.push({
        position: [avgLng, avgLat] as [number, number],
        name: state,
        count: patients.length,
        breaches: breachCount,
        breachRate: patients.length > 0 ? breachCount / patients.length : 0
      });
    });
    return result;
  }, [finalFilteredPatients, isSLABreach]);

  // Aggregate data by district
  const districtAggregatedData = useMemo(() => {
    if (finalFilteredPatients.length === 0) return [];
    
    const districtMap: Record<string, Patient[]> = {};
    finalFilteredPatients.forEach(p => {
      const district = p.screening_district || 'Unknown';
      if (!districtMap[district]) districtMap[district] = [];
      districtMap[district].push(p);
    });

    const result: any[] = [];
    Object.entries(districtMap).forEach(([district, patients]) => {
      if (patients.length === 0) return;
      const avgLat = patients.reduce((sum, p) => sum + (p.screening_latitude || 0), 0) / patients.length;
      const avgLng = patients.reduce((sum, p) => sum + (p.screening_longitude || 0), 0) / patients.length;
      const breachCount = patients.filter(isSLABreach).length;
      result.push({
        position: [avgLng, avgLat] as [number, number],
        name: district,
        count: patients.length,
        breaches: breachCount,
        breachRate: patients.length > 0 ? breachCount / patients.length : 0
      });
    });
    return result;
  }, [finalFilteredPatients, isSLABreach]);

  // Select data based on depth
  const activeHeatmapData = useMemo(() => {
    if (visualizationDepth === 'state') return stateAggregatedData;
    if (visualizationDepth === 'district') return districtAggregatedData;
    return hexagonData;
  }, [visualizationDepth, stateAggregatedData, districtAggregatedData, hexagonData]);

  // Debug: Log aggregation data
  useEffect(() => {
    console.log('🗺️ State Data:', stateAggregatedData.length, stateAggregatedData);
    console.log('📍 District Data:', districtAggregatedData.length, districtAggregatedData);
    console.log('🏥 Facility Data:', hexagonData.length);
    console.log('🎯 Active Depth:', visualizationDepth);
    console.log('📊 Active Data Count:', activeHeatmapData.length);
  }, [stateAggregatedData, districtAggregatedData, hexagonData, visualizationDepth, activeHeatmapData]);

  // Calculate KPI stats for current view
  const kpiStats = useMemo(() => {
    const total = finalFilteredPatients.length;
    const breaches = finalFilteredPatients.filter(isSLABreach).length;
    const breachRate = total > 0 ? (breaches / total) * 100 : 0;
    
    const districts = new Set(finalFilteredPatients.map(p => p.screening_district));
    
    return {
      total,
      breaches,
      breachRate,
      healthyCount: total - breaches,
      districtCount: districts.size
    };
  }, [finalFilteredPatients, isSLABreach]);

  // D3 Spectral Color Engine - 5-step diverging scale
  const D3_COLOR_RANGE = {
    highYield: [16, 185, 129] as [number, number, number],      // >10% - Dark Emerald
    standard: [253, 224, 71] as [number, number, number],       // 5-10% - Yellow
    warning: [249, 115, 22] as [number, number, number],        // 2-5% - Orange
    critical: [239, 68, 68] as [number, number, number],        // <2% - Deep Red
    breachOverride: [153, 27, 27] as [number, number, number],  // >80% breach - Dark Crimson
  };

  // Helper: Calculate Yield (Sputum Tests / Total Screened)
  const calculateYield = useCallback((patients: Patient[]): number => {
    if (patients.length === 0) return 0;
    // Assuming tb_diagnosed indicates sputum test completion
    const sputumTests = patients.filter(p => p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y').length;
    return (sputumTests / patients.length) * 100;
  }, []);

  // Calculate district breach rates for choropleth
  const districtBreachRates = useMemo(() => {
    const districtMap: Record<string, { total: number; breaches: number }> = {};
    
    finalFilteredPatients.forEach(p => {
      const district = p.screening_district || 'Unknown';
      if (!districtMap[district]) {
        districtMap[district] = { total: 0, breaches: 0 };
      }
      districtMap[district].total++;
      if (isSLABreach(p)) {
        districtMap[district].breaches++;
      }
    });

    const rates: Record<string, number> = {};
    Object.entries(districtMap).forEach(([district, data]) => {
      rates[district] = data.total > 0 ? (data.breaches / data.total) * 100 : 0;
    });
    
    return rates;
  }, [finalFilteredPatients, isSLABreach]);

  // Helper: Get color based on yield and breach rate
  const getColorFromYield = useCallback((yieldPercent: number, breachRate: number, totalCount: number, diagnosedCount: number): [number, number, number] => {
    // Override: If breach rate > 80%, use dark crimson
    if (breachRate > 80) return D3_COLOR_RANGE.breachOverride;
    
    // Task 3: Deep Blue for pending (no diagnosed but has patients)
    if (totalCount > 0 && diagnosedCount === 0) {
      return [37, 99, 235] as [number, number, number]; // Deep Blue
    }
    
    // Yield-based coloring
    if (yieldPercent > 10) return D3_COLOR_RANGE.highYield;
    if (yieldPercent >= 5) return D3_COLOR_RANGE.standard;
    if (yieldPercent >= 2) return D3_COLOR_RANGE.warning;
    return D3_COLOR_RANGE.critical;
  }, []);

  // Prepare facility-specific data for ColumnLayer
  const facilityColumnData = useMemo(() => {
    console.log('🏗️ Building facility columns from', finalFilteredPatients.length, 'patients');
    const data = finalFilteredPatients.map(p => {
      const yieldPercent = p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y' ? 100 : 0;
      const breachRate = isSLABreach(p) ? 100 : 0;
      const diagnosedCount = p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y' ? 1 : 0;
      const color = getColorFromYield(yieldPercent, breachRate, 1, diagnosedCount);
      
      return {
        position: [p.screening_longitude || 0, p.screening_latitude || 0],
        patient: p,
        color,
        elevation: 8000,
        radius: 200,
        facilityName: p.facility_name || p.screening_district || 'Unknown Facility'
      };
    });
    console.log('✅ Facility columns ready:', data.length);
    if (data.length > 0) {
      console.log('   Sample:', data[0]);
    }
    return data;
  }, [finalFilteredPatients, isSLABreach, getColorFromYield]);

  // Create GeoJSON features for bar chart visualization with D3 color engine
  const geoJsonData = useMemo(() => {
    const features = activeHeatmapData.map((d: any) => {
      const breachRate = d.breachRate !== undefined ? d.breachRate : (d.isBreach ? 1 : 0);
      
      // Calculate yield for this data point
      const patients = d.patient ? [d.patient] : (d.patients || []);
      const patientArray = Array.isArray(patients) ? patients : [patients];
      const yieldPercent = calculateYield(patientArray);
      const diagnosedCount = patientArray.filter(p => p.tb_diagnosed === 'Yes' || p.tb_diagnosed === 'Y').length;
      
      // Get color from D3 engine
      const color = getColorFromYield(yieldPercent, breachRate * 100, patientArray.length, diagnosedCount);
      
      // Apply jitter for facility-level data to prevent overlap
      const jitterLng = visualizationDepth === 'facility' ? (Math.random() - 0.5) * 0.01 : 0;
      const jitterLat = visualizationDepth === 'facility' ? (Math.random() - 0.5) * 0.01 : 0;
      
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [d.position[0] + jitterLng, d.position[1] + jitterLat]
        },
        properties: {
          name: d.name || 'Facility',
          count: d.count || 1,
          breaches: d.breaches || (d.isBreach ? 1 : 0),
          breachRate,
          yieldPercent,
          color,
          height: (d.count || 1) * (visualizationDepth === 'state' ? 50000 : visualizationDepth === 'district' ? 30000 : 10000)
        }
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features
    } as any;
  }, [activeHeatmapData, visualizationDepth, calculateYield, getColorFromYield]);

  // Bar chart layer (3D extrusion)
  const barLayer = useMemo(() => {
    if (!isClient || !webGLSupported || (visualizationType !== 'bar' && visualizationType !== 'both')) return null;

    try {
      return new GeoJsonLayer({
        id: 'bar-layer',
        data: geoJsonData,
        pickable: true,
        extruded: true,
        wireframe: true,
        pointRadiusMinPixels: 3,
        pointRadiusMaxPixels: 15,
        pointRadiusScale: visualizationDepth === 'state' ? 8000 : visualizationDepth === 'district' ? 5000 : 3000,
        getElevation: (d: any) => d.properties.height,
        getFillColor: (d: any) => {
          const color = d.properties.color;
          return [color[0], color[1], color[2], 200] as [number, number, number, number];
        },
        getLineColor: [255, 255, 255, 80],
        lineWidthMinPixels: 1,
        material: {
          ambient: 0.2,
          diffuse: 0.6,
          shininess: 32,
          specularColor: [60, 64, 70]
        },
        antialiasing: true,
        transitions: {
          getElevation: 800
        },
        onHover: (info: any) => {
          if (info.object) {
            const props = info.object.properties;
            setHoveredHUD({
              district: props.name,
              breachRate: props.breachRate * 100,
              patients: props.count,
              yieldPercent: props.yieldPercent,
              x: info.x,
              y: info.y
            });
          } else {
            setHoveredHUD(null);
          }
        }
      });
    } catch (error) {
      console.error('Error creating BarLayer:', error);
      return null;
    }
  }, [geoJsonData, isClient, webGLSupported, visualizationType, visualizationDepth]);

  // Helper: Get most frequent value from array
  const getMostFrequent = (arr: string[]): string => {
    if (arr.length === 0) return 'Unknown';
    const freq: Record<string, number> = {};
    arr.forEach(item => {
      freq[item] = (freq[item] || 0) + 1;
    });
    return Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);
  };

  // Intelligent Layer Weighting: Dynamic elevation based on total patient count
  const maxPatientCount = useMemo(() => {
    return Math.max(...activeHeatmapData.map((d: any) => d.count || 1), 1);
  }, [activeHeatmapData]);

  // Task 1: ColumnLayer - Facility-Specific Pinpoint Mapping
  const facilityColumnLayer = useMemo(() => {
    console.log('🏛️ Creating ColumnLayer:', {
      isClient,
      webGLSupported,
      dataLength: facilityColumnData.length,
      visualizationType
    });
    
    if (!isClient || !webGLSupported || facilityColumnData.length === 0 || (visualizationType !== 'hexagon' && visualizationType !== 'both')) {
      console.warn('⚠️ ColumnLayer skipped');
      return null;
    }
    
    try {
      return new ColumnLayer({
        id: 'facility-column-layer',
        data: facilityColumnData,
        pickable: true,
        extruded: true,
        diskResolution: 32,
        radius: 200, // Task 2: Precision radius
        elevationScale: 1,
        getPosition: (d: any) => d.position, // Exact coordinates
        getElevation: (d: any) => d.elevation,
        getFillColor: (d: any) => [...d.color, 200] as [number, number, number, number],
        getLineColor: [255, 255, 255, 80],
        lineWidthMinPixels: 1,
        material: {
          ambient: 0.2,
          diffuse: 0.6,
          shininess: 32,
          specularColor: [60, 64, 70]
        },
        transitions: {
          getElevation: 600
        },
        onHover: (info: any) => {
          if (info.object) {
            const patient = info.object.patient;
            setHoveredHUD({
              district: info.object.facilityName,
              breachRate: isSLABreach(patient) ? 100 : 0,
              patients: 1,
              x: info.x,
              y: info.y
            });
          } else {
            setHoveredHUD(null);
          }
        }
      });
    } catch (error) {
      console.error('Error creating ColumnLayer:', error);
      return null;
    }
  }, [facilityColumnData, isClient, webGLSupported, visualizationType, isSLABreach]);

  // Task 3: TextLayer - Street Sign Labels
  const facilityTextLayer = useMemo(() => {
    if (!isClient || !webGLSupported || viewState.zoom < 8 || facilityColumnData.length === 0) return null;
    
    try {
      return new TextLayer({
        id: 'facility-text-layer',
        data: facilityColumnData,
        pickable: false,
        getPosition: (d: any) => d.position,
        getText: (d: any) => d.facilityName,
        getSize: 14,
        getAngle: 0,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        getPixelOffset: [0, -20],
        getColor: [255, 255, 255, 220],
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        outlineWidth: 2,
        outlineColor: [0, 0, 0, 255],
        billboard: true
      });
    } catch (error) {
      console.error('Error creating TextLayer:', error);
      return null;
    }
  }, [facilityColumnData, isClient, webGLSupported, viewState.zoom]);

  // Tactical Dots: ScatterplotLayer for individual facilities when zoomed in
  const facilityScatterLayer = useMemo(() => {
    if (!isClient || !webGLSupported || viewState.zoom < 8) return null;
    
    try {
      return new ScatterplotLayer({
        id: 'facility-scatter',
        data: finalFilteredPatients,
        pickable: true,
        opacity: 0.8,
        stroked: true,
        filled: true,
        radiusScale: 6,
        radiusMinPixels: 3,
        radiusMaxPixels: 8,
        lineWidthMinPixels: 1,
        getPosition: (d: Patient) => [d.screening_longitude || 0, d.screening_latitude || 0],
        getFillColor: (d: Patient) => isSLABreach(d) ? [239, 68, 68] : [34, 197, 94],
        getLineColor: [255, 255, 255],
        onHover: (info: any) => {
          if (info.object) {
            const patient = info.object as Patient;
            setHoveredHUD({
              district: patient.facility_name || patient.screening_district,
              breachRate: isSLABreach(patient) ? 100 : 0,
              patients: 1,
              x: info.x,
              y: info.y
            });
          } else {
            setHoveredHUD(null);
          }
        }
      });
    } catch (error) {
      console.error('Error creating ScatterplotLayer:', error);
      return null;
    }
  }, [finalFilteredPatients, isClient, webGLSupported, viewState.zoom, isSLABreach]);

  // Task 4: God Ray Lighting Effect (Fixed)
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

  // Cinematic flyTo function for smooth district navigation
  const flyToDistrict = useCallback((district: string) => {
    const districtPatients = validPatients.filter(p => p.screening_district === district);
    if (districtPatients.length > 0) {
      const avgLat = districtPatients.reduce((sum, p) => sum + (p.screening_latitude || 0), 0) / districtPatients.length;
      const avgLon = districtPatients.reduce((sum, p) => sum + (p.screening_longitude || 0), 0) / districtPatients.length;
      
      setViewState({
        longitude: avgLon,
        latitude: avgLat,
        zoom: 9.5,
        pitch: 45,
        bearing: -10,
        transitionDuration: 2000,
        transitionInterpolator: new FlyToInterpolator()
      });
    }
  }, [validPatients]);

  // Task 4: Dynamic GeoJSON Clipping - Only Active Districts
  const districtFloorLayer = useMemo(() => {
    if (!isClient || !webGLSupported || !districtGeoJson || !finalFilteredPatients.length) return null;

    // Filter GeoJSON to only include districts with patient data
    const activeDistrictNames = dynamicOperationalData.activeDistricts;
    const filteredGeoJson = {
      ...districtGeoJson,
      features: districtGeoJson.features.filter((f: any) => 
        activeDistrictNames.includes(f.properties.district)
      )
    };

    if (filteredGeoJson.features.length === 0) return null;

    try {
      return new GeoJsonLayer({
        id: 'district-floor-choropleth',
        data: filteredGeoJson,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: false,
        lineWidthMinPixels: 2,
        getFillColor: (d: any) => {
          const district = d.properties.district;
          const breachRate = districtBreachRates[district] || 0;
          
          // Color gradient: Green (0%) -> Yellow (50%) -> Red (100%)
          if (breachRate === 0) return [16, 185, 129, 51]; // Green with 0.2 opacity (51/255)
          if (breachRate < 25) return [34, 197, 94, 51]; // Light Green
          if (breachRate < 50) return [253, 224, 71, 51]; // Yellow
          if (breachRate < 75) return [249, 115, 22, 51]; // Orange
          return [153, 27, 27, 51]; // Dark Red
        },
        getLineColor: [0, 255, 255, 100],
        getLineWidth: 200,
        onClick: (info: any) => {
          if (info.object) {
            const district = info.object.properties.district;
            setDistrict(district);
            flyToDistrict(district);
          }
        },
        onHover: (info: any) => {
          if (info.object) {
            const district = info.object.properties.district;
            const breachRate = districtBreachRates[district] || 0;
            const districtPatients = finalFilteredPatients.filter(p => p.screening_district === district);
            
            if (districtPatients.length > 0) {
              setHoveredHUD({
                district,
                breachRate,
                patients: districtPatients.length,
                x: info.x,
                y: info.y
              });
            }
          } else {
            setHoveredHUD(null);
          }
        },
        updateTriggers: {
          getFillColor: [districtBreachRates]
        }
      });
    } catch (error) {
      console.error('Error creating district floor layer:', error);
      return null;
    }
  }, [isClient, webGLSupported, districtGeoJson, districtBreachRates, finalFilteredPatients, flyToDistrict, setDistrict, dynamicOperationalData.activeDistricts]);

  // Performance guardrail: Memoized layers array to prevent re-calculation on every render
  const layers = useMemo(() => {
    const layerList = [];
    // District floor as bottom-most layer
    if (districtFloorLayer) layerList.push(districtFloorLayer);
    // Facility columns replace hexagons
    if (visualizationType === 'hexagon' || visualizationType === 'both') {
      if (facilityColumnLayer) layerList.push(facilityColumnLayer);
      if (facilityTextLayer) layerList.push(facilityTextLayer);
    }
    if (visualizationType === 'bar' || visualizationType === 'both') {
      if (barLayer) layerList.push(barLayer);
    }
    if (facilityScatterLayer) layerList.push(facilityScatterLayer);
    return layerList;
  }, [districtFloorLayer, facilityColumnLayer, facilityTextLayer, barLayer, facilityScatterLayer, visualizationType]);

  // Handle district filter with smooth flyTo transition
  useEffect(() => {
    const activeDistrict = filter.district || treeFilter?.district;
    if (activeDistrict) {
      const districtPatients = validPatients.filter(p => p.screening_district === activeDistrict);
      if (districtPatients.length > 0) {
        const avgLat = districtPatients.reduce((sum, p) => sum + p.screening_latitude!, 0) / districtPatients.length;
        const avgLon = districtPatients.reduce((sum, p) => sum + p.screening_longitude!, 0) / districtPatients.length;
        setViewState({
          longitude: avgLon,
          latitude: avgLat,
          zoom: 8.5,
          pitch: 60,
          bearing: -20,
          transitionDuration: 2000,
          transitionInterpolator: new FlyToInterpolator()
        });
      }
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
  }, [filter.district, treeFilter?.district, validPatients]);

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

  // Zoom to Fit: Calculate bounding box and fit all data
  const handleZoomToFit = useCallback(() => {
    if (!dataBounds) return;

    const latDiff = dataBounds.maxLat - dataBounds.minLat;
    const lngDiff = dataBounds.maxLng - dataBounds.minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 4;
    if (maxDiff < 1) zoom = 10;
    else if (maxDiff < 3) zoom = 8;
    else if (maxDiff < 5) zoom = 7;
    else if (maxDiff < 10) zoom = 6;
    else zoom = 5;

    setViewState({
      longitude: dataBounds.centerLng,
      latitude: dataBounds.centerLat,
      zoom,
      pitch: 50,
      bearing: 0,
      transitionDuration: 2000,
      transitionInterpolator: new FlyToInterpolator()
    });
  }, [dataBounds]);

  const handleTileClick = useCallback((status: 'All' | 'High Alert' | 'On Track') => {
    setStatus(filter.status === status ? 'All' : status);
  }, [filter.status, setStatus]);

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
      filteredPatients={finalFilteredPatients}
      uniqueCoordinators={uniqueCoordinators}
      onZoomToFit={handleZoomToFit}
      onShowCascade={() => setShowCascade(!showCascade)}
      onShowLeaderboard={() => setShowLeaderboard(!showLeaderboard)}
      showCascade={showCascade}
      showLeaderboard={showLeaderboard}
      heatmapMode={heatmapMode}
      onHeatmapModeChange={setHeatmapMode}
    >
      <div className="relative w-full h-full overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-slate-950">
          {webGLSupported ? (
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
              />
            </DeckGL>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-xl font-bold text-white mb-2">WebGL Not Supported</div>
                <div className="text-slate-400">Your browser doesn't support WebGL rendering</div>
              </div>
            </div>
          )}
        </div>

        {/* Depth Segmented Control - Floating at top-center */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
          <DepthSegmentedControl
            value={heatmapMode}
            onChange={setHeatmapMode}
          />
        </div>

        {/* Cascade Funnel Panel */}
        <AnimatePresence>
          {showCascade && (
            <CascadeFunnelPanel
              filteredPatients={finalFilteredPatients}
              onClose={() => setShowCascade(false)}
            />
          )}
        </AnimatePresence>

        {/* District Leaderboard */}
        <AnimatePresence>
          {showLeaderboard && (
            <DistrictLeaderboard
              filteredPatients={finalFilteredPatients}
              onDistrictSelect={handleDistrictSelect}
              onClose={() => setShowLeaderboard(false)}
            />
          )}
        </AnimatePresence>

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

      {/* Visualization Type Control */}
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="absolute top-6 right-6 z-40">
        <div className="backdrop-blur-xl bg-slate-900/85 border border-cyan-500/30 rounded-xl px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">View:</span>
            <div className="flex gap-1">
              {(['hexagon', 'bar', 'both'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setVisualizationType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    visualizationType === type
                      ? 'bg-cyan-500/30 text-cyan-200'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'hexagon' && <MapPinned className="w-3.5 h-3.5" />}
                  {type === 'bar' && <BarChart3 className="w-3.5 h-3.5" />}
                  {type === 'both' && <Layers className="w-3.5 h-3.5" />}
                  {type === 'hexagon' ? 'Heat' : type === 'bar' ? 'Bar' : 'Both'}
                </button>
              ))}
            </div>
          </div>
        </div>
        </motion.div>

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
