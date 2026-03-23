import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SonicLanguage } from '@/utils/sonicLanguages';

export type EntityMode = 'nano' | 'micro' | 'normal' | 'macro' | 'grounded';
export type EntityState = 'idle' | 'patrolling' | 'investigating' | 'alerting' | 'reporting' | 'idle_ground' | 'greeting' | 'excited';
export type EntityPower = 'scan' | 'shockwave' | 'phase' | 'freeze' | 'shield' | null;
export type CharacterType = 'mimi' | 'sonic' | 'genie' | 'robot';

interface Position { x: number; y: number; lat?: number; lng?: number; }
interface DistrictData { district: string; state: string; screened: number; diagnosed: number; initiated: number; completed: number; breachCount: number; breachRate: number; }
interface Alert { id: string; district: string; severity: 'low' | 'medium' | 'high' | 'critical'; message: string; timestamp: number; }
interface UserPattern { favoriteDistricts: string[]; checkSequence: string[]; activeHours: number[]; avgSessionDuration: number; lastVisit: number; }
interface WorkflowEntry { path: string; label: string; ts: number; }
interface CommandHistoryEntry { cmd: string; ts: number; result: string; }

export interface SonicPresentationCue {
  type: 'intro' | 'midpoint' | 'outro';
  timestamp: number;
  insights?: string[];
}

interface EntityStore {
  mode: EntityMode;
  position: Position;
  targetPosition: Position | null;
  isFlying: boolean;
  state: EntityState;
  currentPower: EntityPower;
  characterType: CharacterType;
  districtData: DistrictData[];
  focusedDistrict: string | null;
  alertQueue: Alert[];
  userPatterns: UserPattern;
  mapInstance: any | null;
  sonicAlerts: string[];
  breachSpikeBase: number;
  lastBreachCount: number;
  duplicateCount: number;
  eligibleCount: number;
  dataHealthScore: number;
  workflowHistory: WorkflowEntry[];
  sonicFlyTarget: { district?: string; state?: string; metric?: string } | null;
  sonicTetherDistrict: string | null;
  commandHistory: CommandHistoryEntry[];
  gisHotspots: Array<{ district: string; breachRate: number; key: string }>;
  activeGISMetric: string;
  showGISLeaderboard: boolean;
  showGISCascade: boolean;
  activeFilters: {
    state: string | null;
    district: string | null;
    coordinator: string | null;
    phase: string | null;
    status: 'All' | 'High Alert' | 'On Track';
  };
  sonicLanguage: SonicLanguage;
  sonicDeepScanTarget: string | null;
  sonicDeepScanData: { district: string; screened: number; breaches: number; breachRate: number } | null;
  // Neural Nexus State
  selectedPatient: any | null;
  neuralNexusViewerOpen: boolean;

  setMode: (mode: EntityMode) => void;
  setState: (state: EntityState) => void;
  setPosition: (position: Position) => void;
  setCharacterType: (type: CharacterType) => void;
  moveTo: (lat: number, lng: number, district?: string) => void;
  activatePower: (power: EntityPower) => void;
  setDistrictData: (data: DistrictData[]) => void;
  addAlert: (alert: Alert) => void;
  clearAlert: (id: string) => void;
  setFocusedDistrict: (district: string | null) => void;
  learnPattern: (action: string, district: string) => void;
  setMapInstance: (map: any) => void;
  reset: () => void;
  pushSonicAlert: (msg: string) => void;
  setBreachSpikeBase: (n: number) => void;
  setDuplicateCount: (n: number) => void;
  setEligibleCount: (n: number) => void;
  setDataHealthScore: (n: number) => void;
  pushWorkflowHistory: (entry: { path: string; label: string }) => void;
  setSonicFlyTarget: (t: { district?: string; state?: string; metric?: string } | null) => void;
  setSonicTetherDistrict: (d: string | null) => void;
  pushCommandHistory: (entry: CommandHistoryEntry) => void;
  setGISHotspots: (h: any[]) => void;
  setActiveGISMetric: (m: string) => void;
  setShowGISLeaderboard: (v: boolean) => void;
  setShowGISCascade: (v: boolean) => void;
  setGlobalFilter: (f: Partial<EntityStore['activeFilters']>) => void;
  setSonicLanguage: (lang: SonicLanguage) => void;
  setSonicDeepScanTarget: (district: string | null) => void;
  setSonicDeepScanData: (data: { district: string; screened: number; breaches: number; breachRate: number } | null) => void;
  setSelectedPatient: (patient: any | null) => void;
  setNeuralNexusViewerOpen: (open: boolean) => void;
  
  // Temporal Mapping State
  isTemporalMode: boolean;
  timeRange: [number, number];
  currentPlayhead: number;
  isPlaying: boolean;
  isPausedForSonic: boolean;
  isAnalyzing: boolean;
  lastSonicCommand: string;
  sonicActivePresentationCue: SonicPresentationCue | null;
  
  setTemporalMode: (v: boolean) => void;
  setTimeRange: (range: [number, number]) => void;
  setCurrentPlayhead: (ts: number) => void;
  setIsPlaying: (v: boolean) => void;
  setPausedForSonic: (v: boolean) => void;
  setIsAnalyzing: (v: boolean) => void;
  setLastSonicCommand: (cmd: string) => void;
  setSonicActivePresentationCue: (cue: SonicPresentationCue | null) => void;
}

export const useEntityStore = create<EntityStore>()(
  persist(
    (set, get) => ({
      mode: 'micro',
      position: { x: 0, y: 0 }, // set correctly by FloatingEntity mount effect
      targetPosition: null,
      isFlying: false,
      state: 'idle',
      characterType: 'mimi',
      currentPower: null,
      districtData: [],
      focusedDistrict: null,
      alertQueue: [],
      userPatterns: { favoriteDistricts: [], checkSequence: [], activeHours: [], avgSessionDuration: 0, lastVisit: 0 },
      mapInstance: null,
      sonicAlerts: [],
      breachSpikeBase: 0,
      lastBreachCount: 0,
      duplicateCount: 0,
      eligibleCount: 0,
      dataHealthScore: 100,
      workflowHistory: [],
      sonicFlyTarget: null,
      sonicTetherDistrict: null,
      commandHistory: [],
      gisHotspots: [],
      activeGISMetric: 'breaches',
      showGISLeaderboard: false,
      showGISCascade: false,
      activeFilters: { state: null, district: null, coordinator: null, phase: null, status: 'All' },
      sonicLanguage: 'en' as SonicLanguage,
      sonicDeepScanTarget: null,
      sonicDeepScanData: null,
      selectedPatient: null,
      neuralNexusViewerOpen: false,
      
      // Temporal initial state (SSR-safe: using static timestamps)
      isTemporalMode: false,
      timeRange: [1672531200000, 1672531200000] as [number, number], // Static: 2023-01-01 00:00:00 UTC
      currentPlayhead: 1672531200000 as number, // Static: 2023-01-01 00:00:00 UTC
      isPlaying: false,
      isPausedForSonic: false,
      isAnalyzing: false,
      lastSonicCommand: '',
      sonicActivePresentationCue: null,

      setMode: (mode) => set({ mode }),
      setState: (state) => set({ state }),
      setPosition: (position) => set({ position }),
      setCharacterType: (type) => set({ characterType: type }),

      moveTo: (lat, lng, district) => set({
        targetPosition: { x: 0, y: 0, lat, lng },
        isFlying: true,
        mode: 'nano',
        focusedDistrict: district || null,
      }),

      activatePower: (power) => set({ currentPower: power }),

      setDistrictData: (data) => {
        set({ districtData: data });
        const criticalBreaches = data.filter(d => d.breachRate > 0.7);
        if (criticalBreaches.length > 0) {
          const alerts: Alert[] = criticalBreaches.map(d => ({
            id: `alert-${d.district}-${Date.now()}`,
            district: d.district,
            severity: d.breachRate > 0.9 ? 'critical' : 'high',
            message: `${d.breachCount} SLA breaches in ${d.district}`,
            timestamp: Date.now(),
          }));
          set({ alertQueue: [...get().alertQueue, ...alerts] });
        }
      },

      addAlert: (alert) => set({ alertQueue: [...get().alertQueue, alert] }),
      clearAlert: (id) => set({ alertQueue: get().alertQueue.filter(a => a.id !== id) }),
      setFocusedDistrict: (district) => set({ focusedDistrict: district }),

      learnPattern: (action, district) => {
        const { userPatterns } = get();
        const hour = new Date().getHours();
        set({
          userPatterns: {
            ...userPatterns,
            checkSequence: [...userPatterns.checkSequence, district].slice(-20),
            activeHours: [...userPatterns.activeHours, hour].slice(-100),
            favoriteDistricts: Array.from(new Set([...userPatterns.favoriteDistricts, district])).slice(0, 10),
            lastVisit: Date.now(),
          },
        });
      },

      setMapInstance: (map) => set({ mapInstance: map }),
      reset: () => set({ mode: 'micro', position: { x: 0, y: 0 }, targetPosition: null, isFlying: false, state: 'idle', currentPower: null, focusedDistrict: null, alertQueue: [] }),

      pushSonicAlert: (msg) => set(state => ({ sonicAlerts: [...state.sonicAlerts.slice(-9), msg] })),
      setBreachSpikeBase: (n) => set({ breachSpikeBase: n }),
      setDuplicateCount: (n) => set({ duplicateCount: n }),
      setEligibleCount: (n) => set({ eligibleCount: n }),
      setDataHealthScore: (n) => set({ dataHealthScore: n }),
      pushWorkflowHistory: (entry) => set(state => ({
        workflowHistory: [{ ...entry, ts: Date.now() }, ...state.workflowHistory.slice(0, 4)]
      })),

      // When a fly target with a district or state is set, also persist it as the tether district
      setSonicFlyTarget: (t) => {
        set({ sonicFlyTarget: t });
        if (t?.district) set({ sonicTetherDistrict: t.district });
        else if (t?.state) set({ sonicTetherDistrict: t.state });
      },
      setSonicTetherDistrict: (d) => set({ sonicTetherDistrict: d }),

      pushCommandHistory: (entry) => set(state => ({
        commandHistory: [entry, ...state.commandHistory.slice(0, 19)]
      })),
      setGISHotspots: (h) => set({ gisHotspots: h }),
      setActiveGISMetric: (m) => set({ activeGISMetric: m }),
      setShowGISLeaderboard: (v) => set({ showGISLeaderboard: v }),
      setShowGISCascade: (v) => set({ showGISCascade: v }),
      setGlobalFilter: (f) => set(state => ({ activeFilters: { ...state.activeFilters, ...f } })),
      setSonicLanguage: (lang) => {
        if (typeof localStorage !== 'undefined') localStorage.setItem('sonic-lang', lang);
        set({ sonicLanguage: lang });
      },
      setSonicDeepScanTarget: (district) => set({ sonicDeepScanTarget: district }),
      setSonicDeepScanData: (data) => set({ sonicDeepScanData: data }),
      setSelectedPatient: (patient) => set({ selectedPatient: patient }),
      setNeuralNexusViewerOpen: (open) => set({ neuralNexusViewerOpen: open }),
      setTemporalMode: (v) => set({ isTemporalMode: v }),
      setTimeRange: (range) => set({ timeRange: range }),
      setCurrentPlayhead: (ts) => set({ currentPlayhead: ts }),
      setIsPlaying: (v) => set({ isPlaying: v }),
      setPausedForSonic: (v) => set({ isPausedForSonic: v }),
      setIsAnalyzing: (v) => set({ isAnalyzing: v }),
      setLastSonicCommand: (cmd) => set({ lastSonicCommand: cmd }),
      setSonicActivePresentationCue: (cue) => set({ sonicActivePresentationCue: cue }),
    }),
    {
      name: 'genie-entity-state',
      partialize: (state) => ({
        userPatterns: state.userPatterns,
        mode: state.mode,
        characterType: state.characterType,
        sonicLanguage: state.sonicLanguage,
      }),
      version: 1,
    }
  )
);
