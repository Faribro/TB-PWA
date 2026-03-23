// SONIC ASSISTANT - NEXT LEVEL UPGRADES
// Based on full project scan of TB-PWA-Clean

export const SONIC_CAPABILITIES = {
  
  // ═══════════════════════════════════════════════════════════════════
  // 🎯 LEVEL 1: DEEP DATA INTEGRATION (HIGHEST IMPACT)
  // ═══════════════════════════════════════════════════════════════════
  
  dataIntegration: {
    priority: 'CRITICAL',
    impact: 'Transforms Sonic from toy to essential tool',
    
    capabilities: [
      {
        name: 'Real-time SLA Breach Alerts',
        hook: 'useSWRAllPatients',
        trigger: 'When breach count spikes >10% in 5 minutes',
        action: 'Sonic stops, shows urgent alert with district names',
        code: `
          // In FloatingEntity.tsx
          const { data: allPatients } = useSWRAllPatients();
          const breachCount = useMemo(() => 
            allPatients?.filter(p => isSLABreach(p)).length || 0
          , [allPatients]);
          
          useEffect(() => {
            if (breachCount > prevBreachCount + 10) {
              triggerAlert('🚨 BREACH SPIKE! +' + (breachCount - prevBreachCount) + ' new breaches!');
            }
          }, [breachCount]);
        `
      },
      
      {
        name: 'M&E Duplicate Detection Alerts',
        source: 'MandEHub.tsx duplicate detection engine',
        trigger: 'When duplicatePairs.length > 5',
        action: 'Sonic alerts: "⚠️ 12 duplicate patients detected! Check M&E Hub"',
        integration: 'Wire useEntityStore to MandEHub duplicate state'
      },
      
      {
        name: 'Follow-up Pipeline Triage Ready',
        source: 'FollowUpPipeline.tsx eligibleCount',
        trigger: 'When eligibleCount > 50',
        action: 'Sonic: "✅ 87 patients ready for bulk triage!"',
        benefit: 'Proactive workflow optimization'
      },
      
      {
        name: 'GIS Map Hotspot Detection',
        source: 'SpatialIntelligenceMap.tsx choroplethDict',
        trigger: 'When district breachRate > 80%',
        action: 'Sonic: "🗺️ Pune district critical! 92% breach rate"',
        enhancement: 'Click alert → auto-navigate to GIS map + flyTo district'
      },
      
      {
        name: 'Data Health Score Monitor',
        source: 'MandEHub.tsx useTruthEngine healthScore',
        trigger: 'When healthScore drops below 70',
        action: 'Sonic: "⚠️ Data health at 68%! Check integrity scanner"',
        value: 'Proactive data quality management'
      }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // 🧭 LEVEL 2: SMART NAVIGATION ASSISTANT
  // ═══════════════════════════════════════════════════════════════════
  
  navigation: {
    priority: 'HIGH',
    impact: 'Makes Sonic a productivity multiplier',
    
    features: [
      {
        name: 'Context-Aware Quick Actions',
        implementation: `
          // Detect current page context
          const quickActions = useMemo(() => {
            if (pathname.includes('/dashboard')) {
              return [
                { label: '🗺️ Jump to GIS', action: () => router.push('/gis') },
                { label: '📊 M&E Hub', action: () => router.push('/mande') },
                { label: '🔍 Follow-up', action: () => router.push('/follow-up') }
              ];
            }
            if (pathname.includes('/gis')) {
              return [
                { label: '📍 Zoom to Breaches', action: () => setActiveMetric('breaches') },
                { label: '🎯 Show Leaderboard', action: () => setShowLeaderboard(true) },
                { label: '📊 Cascade View', action: () => setShowCascade(true) }
              ];
            }
            // ... more contexts
          }, [pathname]);
        `
      },
      
      {
        name: 'Voice Command Shortcuts',
        examples: [
          'Click Sonic → "Show me top breaches" → Navigates to M&E Hub filtered',
          'Click Sonic → "Where is Pune?" → Flies to Pune on GIS map',
          'Click Sonic → "Triage ready?" → Opens Follow-up Pipeline with eligible count'
        ],
        tech: 'Simple keyword matching (no API needed initially)'
      },
      
      {
        name: 'Workflow Memory',
        concept: 'Sonic remembers your last 5 actions',
        ui: 'Panel shows: "Recent: GIS Map → Pune → M&E Hub → Duplicates"',
        action: 'Click any step to jump back',
        storage: 'localStorage with timestamp'
      }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // 📊 LEVEL 3: INTELLIGENT INSIGHTS ENGINE
  // ═══════════════════════════════════════════════════════════════════
  
  insights: {
    priority: 'MEDIUM',
    impact: 'Proactive intelligence vs reactive queries',
    
    algorithms: [
      {
        name: 'Anomaly Detection',
        logic: `
          // Detect unusual patterns
          const detectAnomalies = (patients) => {
            const today = patients.filter(p => isToday(p.screening_date));
            const avgDaily = historicalAverage(patients);
            
            if (today.length > avgDaily * 1.5) {
              return { type: 'spike', message: 'Screening volume 50% above normal!' };
            }
            
            const breachRate = today.filter(isSLABreach).length / today.length;
            if (breachRate > 0.3) {
              return { type: 'quality', message: 'Breach rate spiking today!' };
            }
          };
        `
      },
      
      {
        name: 'Predictive Alerts',
        examples: [
          'If Monday screening = 200, predict: "📈 Expect 800+ by Friday"',
          'If breach trend up 3 days: "⚠️ Breach rate trending up 15%"',
          'If duplicates growing: "🔍 Duplicate rate increased 2x this week"'
        ]
      },
      
      {
        name: 'Performance Leaderboard',
        concept: 'Sonic tracks YOUR productivity',
        metrics: [
          'Patients triaged this session',
          'Districts reviewed',
          'Breaches resolved',
          'Time saved vs manual workflow'
        ],
        gamification: 'Daily streak counter, achievement badges'
      }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // 🎨 LEVEL 4: VISUAL ENHANCEMENTS
  // ═══════════════════════════════════════════════════════════════════
  
  visuals: {
    priority: 'LOW',
    impact: 'Polish and delight',
    
    effects: [
      {
        name: 'Afterimage Trail (Boost Mode)',
        description: 'Iconic Sonic speed blur effect',
        implementation: 'Record last 5 positions, render ghost clones with opacity fade',
        performance: 'Minimal - just 5 extra divs during boost'
      },
      
      {
        name: 'Ring Sound on Greeting',
        tech: 'Web Audio API (no library)',
        code: `
          const playRingSound = () => {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            osc.frequency.setValueAtTime(988, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1976, ctx.currentTime + 0.1);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          };
        `
      },
      
      {
        name: 'Particle Effects on Critical Alerts',
        description: 'Red particles burst when critical breach detected',
        library: 'CSS animations only (no canvas overhead)'
      }
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // 🚀 IMPLEMENTATION PRIORITY
  // ═══════════════════════════════════════════════════════════════════
  
  roadmap: {
    phase1_immediate: [
      '1. Wire districtData from useEntityStore (DONE)',
      '2. Add SLA breach spike detection',
      '3. Add M&E duplicate count alerts',
      '4. Add Follow-up triage ready notification',
      '5. Add 2 more quick action buttons (Navigate + Help)'
    ],
    
    phase2_thisWeek: [
      '1. GIS map hotspot integration',
      '2. Context-aware quick actions per page',
      '3. Workflow memory (recent actions)',
      '4. Data health score monitoring'
    ],
    
    phase3_nextSprint: [
      '1. Anomaly detection engine',
      '2. Predictive alerts',
      '3. Performance leaderboard',
      '4. Voice command shortcuts'
    ],
    
    phase4_polish: [
      '1. Afterimage trail effect',
      '2. Ring sound effects',
      '3. Particle effects',
      '4. Achievement system'
    ]
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // 💡 KEY INSIGHTS FROM PROJECT SCAN
  // ═══════════════════════════════════════════════════════════════════
  
  projectInsights: {
    dataFlow: {
      source: 'useSWRAllPatients fetches all 14K+ patients',
      storage: 'useEntityStore manages districtData aggregation',
      consumers: [
        'CommandCenter.tsx - Main patient table',
        'MandEHub.tsx - Duplicate detection + integrity',
        'FollowUpPipeline.tsx - Triage workflow',
        'SpatialIntelligenceMap.tsx - GIS visualization'
      ],
      opportunity: 'Sonic can tap into ALL these data streams for real-time intelligence'
    },
    
    userWorkflow: {
      typical: [
        '1. Login → Dashboard (CommandCenter)',
        '2. Check GIS map for hotspots',
        '3. Review M&E Hub for duplicates',
        '4. Process Follow-up Pipeline triage',
        '5. Update patient records'
      ],
      sonicRole: 'Guide user through workflow, surface urgent items proactively'
    },
    
    performanceBottlenecks: {
      issue: '14K patients = heavy renders',
      solution: 'Sonic uses memoized aggregations, no re-renders during walk',
      benefit: 'Can monitor data without impacting performance'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// 📝 NEXT STEPS
// ═══════════════════════════════════════════════════════════════════

export const NEXT_ACTIONS = `
IMMEDIATE (This Session):
1. Add SLA breach spike detection to FloatingEntity
2. Add M&E duplicate count integration
3. Add Follow-up triage ready notification
4. Add Navigate + Help quick action buttons
5. Test with real TB data

THIS WEEK:
1. Wire GIS map hotspot alerts
2. Implement context-aware actions per page
3. Add workflow memory (recent actions)
4. Add data health score monitoring

FUTURE:
1. Anomaly detection engine
2. Predictive alerts
3. Performance leaderboard
4. Voice commands
5. Visual effects (afterimage, sounds, particles)
`;
