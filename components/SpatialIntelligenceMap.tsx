'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import dynamic from 'next/dynamic';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import Map from 'react-map-gl/maplibre';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Zap, AlertTriangle, TrendingUp, Activity, X, Search } from 'lucide-react';
import { useTreeFilter } from '@/contexts/TreeFilterContext';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { FlyToInterpolator } from '@deck.gl/core';
import { MapKPIOverlay } from './MapKPIOverlay';

const DeckGL = dynamic(() => import('@deck.gl/react').then(mod => mod.default), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-950" />
});

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

interface HexagonData {
  position: [number, number];
  count: number;
  breaches: number;
  breachPercentage: number;
  district: string;
  patients: Patient[];
  clusterName?: string;
  primaryCoordinator?: string;
}

interface TooltipData {
  totalPatients: number;
  slaBreaches: number;
  clusterName: string;
  primaryCoordinator: string;
  breachPercentage: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface SpatialIntelligenceMapProps {
  globalPatients?: Patient[];
}

export default memo(function SpatialIntelligenceMap({ globalPatients = [] }: SpatialIntelligenceMapProps) {
  const { filter } = useTreeFilter();
  const [viewState, setViewState] = useState<any>({
    longitude: 78.4,
    latitude: 20.5,
    zoom: 4.5,
    pitch: 55,
    bearing: -15
  });
  const [hoveredTooltip, setHoveredTooltip] = useState<TooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(false);
  const [selectedCoordinator, setSelectedCoordinator] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const deckRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      setWebGLSupported(true);
    }
  }, []);

  // Geospatial Simulator - Generate mock coordinates for testing
  const processedPatients = useMemo(() => {
    return globalPatients.map(patient => {
      if (patient.screening_latitude && patient.screening_longitude && 
          typeof patient.screening_latitude === 'number' && 
          typeof patient.screening_longitude === 'number') {
        return patient;
      }
      
      const mockLat = 21.0 + Math.random() * 3.0;
      const mockLng = 74.0 + Math.random() * 6.0;
      
      return {
        ...patient,
        screening_latitude: mockLat,
        screening_longitude: mockLng
      };
    });
  }, [globalPatients]);

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

  // Apply Live Tactical Filter
  const filteredMapData = useMemo(() => {
    let filtered = validPatients;

    // Filter by coordinator
    if (selectedCoordinator) {
      filtered = filtered.filter(p => p.staff_name === selectedCoordinator);
    }

    // Filter by status
    if (selectedStatus === 'High Alert') {
      filtered = filtered.filter(p => isSLABreach(p));
    } else if (selectedStatus === 'On Track') {
      filtered = filtered.filter(p => !isSLABreach(p));
    }

    return filtered;
  }, [validPatients, selectedCoordinator, selectedStatus, isSLABreach]);

  // Apply tree filter to patients
  const finalFilteredPatients = useMemo(() => {
    if (!filter?.district) return filteredMapData;
    return filteredMapData.filter(p => p.screening_district === filter.district);
  }, [filteredMapData, filter]);

  // Prepare data for hexagon layer
  const hexagonData = useMemo(() => {
    return finalFilteredPatients.map(p => (({
      position: [p.screening_longitude!, p.screening_latitude!] as [number, number],
      patient: p,
      isBreach: isSLABreach(p)
    })));
  }, [finalFilteredPatients, isSLABreach]);

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

  // Helper: Get most frequent value from array
  const getMostFrequent = (arr: string[]): string => {
    if (arr.length === 0) return 'Unknown';
    const freq: Record<string, number> = {};
    arr.forEach(item => {
      freq[item] = (freq[item] || 0) + 1;
    });
    return Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);
  };

  // Hexagon layer configuration - Optimized for 14K+ points
  const hexagonLayer = useMemo(() => {
    if (!isClient || !webGLSupported || hexagonData.length === 0) return null;
    
    try {
      return new HexagonLayer({
        id: 'hexagon-layer-3d',
        data: hexagonData,
        pickable: true,
        extruded: true,
        radius: 40000,
        elevationScale: 100,
        elevationRange: [0, 3000],
        coverage: 0.88,
        getPosition: (d: any) => d.position,
        getElevationWeight: 1,
        getColorWeight: (d: any) => (d.isBreach ? 1 : 0),
        colorAggregation: 'MEAN',
        elevationAggregation: 'SUM',
        colorRange: [
          [16, 185, 129],
          [34, 211, 238],
          [96, 165, 250],
          [251, 191, 36],
          [251, 146, 60],
          [239, 68, 68]
        ],
        colorDomain: [0, 0.2],
        material: {
          ambient: 0.64,
          diffuse: 0.6,
          shininess: 32,
          specularColor: [51, 51, 51]
        },
        transitions: {
          elevationScale: 600
        },
        onHover: (info: any) => {
          if (info.object && info.object.points) {
            const points = info.object.points;
            const totalPatients = points.length;
            const slaBreaches = points.filter((p: any) => isSLABreach(p)).length;
            const breachPercentage = totalPatients > 0 ? (slaBreaches / totalPatients) * 100 : 0;
            
            // Extract most frequent facility/district
            const clusterNames = points.map((p: any) => p.facility_name || p.screening_district);
            const clusterName = getMostFrequent(clusterNames);
            
            // Extract most frequent coordinator
            const coordinators = points.map((p: any) => p.staff_name || 'Unassigned');
            const primaryCoordinator = getMostFrequent(coordinators);
            
            setHoveredTooltip({
              totalPatients,
              slaBreaches,
              clusterName,
              primaryCoordinator,
              breachPercentage
            });
            setTooltipPosition({ x: info.x, y: info.y });
          } else {
            setHoveredTooltip(null);
            setTooltipPosition(null);
          }
          return false;
        }
      });
    } catch (error) {
      console.error('Error creating HexagonLayer:', error);
      return null;
    }
  }, [hexagonData, isClient, webGLSupported, isSLABreach]);

  // Handle district filter with smooth flyTo transition
  useEffect(() => {
    if (filter?.district) {
      const districtPatients = finalFilteredPatients.filter(p => p.screening_district === filter.district);
      if (districtPatients.length > 0) {
        const lats = districtPatients.map(p => p.screening_latitude!);
        const lons = districtPatients.map(p => p.screening_longitude!);
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLon = lons.reduce((a, b) => a + b, 0) / lons.length;
        
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
  }, [filter?.district, finalFilteredPatients]);

  const layers = useMemo(() => {
    return hexagonLayer ? [hexagonLayer] : [];
  }, [hexagonLayer]);

  if (!isClient || !webGLSupported) {
    return (
      <div className="relative w-full h-[calc(100vh-100px)] overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Loading 3D Visualization...</div>
          <div className="text-slate-400">Initializing WebGL Engine</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-100px)] overflow-hidden bg-slate-900">
      {/* Deck.gl 3D Canvas with MapLibre */}
      <div className="absolute inset-0 bg-slate-950">
        <DeckGL
          ref={deckRef}
          viewState={viewState}
          controller={{
            touchRotate: true,
            touchZoom: true,
            dragRotate: true,
            scrollZoom: true,
            keyboard: true
          }}
          layers={layers}
          onViewStateChange={(e: any) => setViewState(e.viewState)}
          style={{ width: '100%', height: '100%' }}
          onWebGLInitialized={(gl: any) => {
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
          }}
        >
          <Map
            reuseMaps
            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          />
        </DeckGL>
      </div>

      {/* Map KPI Overlay Grid */}
      <MapKPIOverlay filteredPatients={finalFilteredPatients} />

      {/* Live Tactical Filter Overlay */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 right-6 z-40"
      >
        <div className="backdrop-blur-md bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl shadow-cyan-500/10 w-80">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-cyan-300 uppercase tracking-widest">Tactical Filter</span>
          </div>

          {/* Prison Coordinator Filter */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-300 mb-2 block">Prison Coordinator</label>
            <select
              value={selectedCoordinator}
              onChange={(e) => setSelectedCoordinator(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="">All Coordinators</option>
              {uniqueCoordinators.map(coord => (
                <option key={coord} value={coord}>{coord}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-300 mb-2 block">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="All">All</option>
              <option value="High Alert">High Alert</option>
              <option value="On Track">On Track</option>
            </select>
          </div>

          {/* Active Filters Display */}
          {(selectedCoordinator || selectedStatus !== 'All') && (
            <div className="pt-3 border-t border-slate-700">
              <div className="text-xs text-slate-400 mb-2">Active Filters:</div>
              <div className="flex flex-wrap gap-2">
                {selectedCoordinator && (
                  <div className="bg-cyan-500/20 border border-cyan-500/50 rounded-full px-3 py-1 text-xs text-cyan-300 flex items-center gap-2">
                    {selectedCoordinator}
                    <button
                      onClick={() => setSelectedCoordinator('')}
                      className="hover:text-cyan-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {selectedStatus !== 'All' && (
                  <div className="bg-amber-500/20 border border-amber-500/50 rounded-full px-3 py-1 text-xs text-amber-300 flex items-center gap-2">
                    {selectedStatus}
                    <button
                      onClick={() => setSelectedStatus('All')}
                      className="hover:text-amber-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Enhanced 3D Tooltip with Aggregation Data */}
      <AnimatePresence>
        {hoveredTooltip && tooltipPosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            style={{
              position: 'absolute',
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 140}px`,
              pointerEvents: 'none'
            }}
            className="z-40"
          >
            <div className="backdrop-blur-xl bg-slate-900/95 border border-cyan-500/50 rounded-2xl p-5 shadow-2xl shadow-cyan-500/20 max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <span className="text-base font-black text-white">{hoveredTooltip.clusterName}</span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">{hoveredTooltip.totalPatients} Total Patients</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">SLA Breaches</span>
                  <span className={`font-black text-lg ${hoveredTooltip.breachPercentage > 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {hoveredTooltip.slaBreaches} ({hoveredTooltip.breachPercentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                  <span className="text-slate-400 text-xs">Primary Staff</span>
                  <span className="text-cyan-300 font-semibold text-sm">{hoveredTooltip.primaryCoordinator}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="text-xs text-slate-500">
                  {hoveredTooltip.breachPercentage > 20 ? (
                    <span className="text-red-400 font-semibold">⚠️ High Risk Zone</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">✓ Healthy Zone</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI HUD - Top Left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6 z-30 space-y-3"
      >
        <div className="backdrop-blur-xl bg-slate-900/85 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl shadow-cyan-500/20 min-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest">Active View</span>
          </div>
          <div className="text-4xl font-black text-white mb-1">{kpiStats.total.toLocaleString()}</div>
          <div className="text-xs text-slate-400">Patients {filter?.district ? `in ${filter.district}` : 'Nationwide'}</div>
        </div>
      </motion.div>

      {/* KPI HUD - Top Right (Below Filter) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-80 right-6 z-30 space-y-3"
      >
        <div className="backdrop-blur-xl bg-slate-900/85 border border-red-500/40 rounded-2xl p-5 shadow-2xl shadow-red-500/20 min-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-xs font-bold text-red-300 uppercase tracking-widest">Critical</span>
          </div>
          <div className="text-4xl font-black text-red-400 mb-1">
            {kpiStats.breaches.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">
            {kpiStats.breachRate.toFixed(1)}% SLA Breach Rate
          </div>
        </div>
      </motion.div>

      {/* KPI HUD - Bottom Left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute bottom-6 left-6 z-30"
      >
        <div className="backdrop-blur-xl bg-slate-900/85 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl shadow-emerald-500/20 min-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Healthy</span>
          </div>
          <div className="text-4xl font-black text-emerald-400 mb-1">
            {kpiStats.healthyCount.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">On-Track Patients</div>
        </div>
      </motion.div>

      {/* KPI HUD - Bottom Right */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute bottom-6 right-6 z-30"
      >
        <div className="backdrop-blur-xl bg-slate-900/85 border border-purple-500/40 rounded-2xl p-5 shadow-2xl shadow-purple-500/20 min-w-[200px]">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">Coverage</span>
          </div>
          <div className="text-4xl font-black text-purple-400 mb-1">
            {kpiStats.districtCount}
          </div>
          <div className="text-xs text-slate-400">Districts Mapped</div>
        </div>
      </motion.div>

      {/* Map Controls Info */}
      <AnimatePresence>
        {filter?.district && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="backdrop-blur-xl bg-cyan-900/80 border border-cyan-500/50 rounded-xl px-5 py-2.5 text-sm text-cyan-100 shadow-lg shadow-cyan-500/20 font-semibold">
              📍 Viewing: {filter.district}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
