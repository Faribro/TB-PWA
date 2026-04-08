import { Tour } from '@/stores/tourStore'
import type { LanguageCode } from '@/stores/tourStore'

// Helper to create a robust selector with fallbacks
const sel = (...candidates: string[]) => candidates.join(', ')

// Localization resolver: supports string OR localized object
export function resolveLocalized(
  value: string | Partial<Record<LanguageCode, string>>,
  lang: LanguageCode,
  fallback: LanguageCode = 'en'
): string {
  if (typeof value === 'string') return value
  return value[lang] || value[fallback] || Object.values(value)[0] || ''
}

export const ALL_TOURS: Tour[] = [
  // TOUR 1: "Update a Patient's Clinical Status"
  {
    id: 'update-screening-date',
    title: "Update a Patient's Clinical Status",
    description:
      'Walk through the complete clinical update workflow — ' +
      'from selecting a screening date to recording sputum results, ' +
      'diagnosis, ATT initiation, and treatment completion.',
    category: 'screening',
    estimatedMinutes: 5,
    enabled: true,
    steps: [
      {
        id: 'intro',
        title: "Update a Patient's Clinical Status",
        body:
          'This tour walks you through the complete patient ' +
          'update lifecycle in Vertex — from selecting a screening ' +
          'date to recording diagnosis and treatment outcomes.',
        target: null,
        placement: 'center',
        route: '/dashboard/vertex',
      },
      {
        id: 'navigate-to-vertex',
        title: 'Open the Vertex Module',
        body:
          'Click the Vertex link in the left sidebar to open the Neural Timeline — ' +
          'your hub for patient screening activity.',
        target: '[data-tour-id="sidebar-vertex"]',
        placement: 'right',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        action: 'click',
      },
      {
        id: 'neural-timeline-calendar',
        title: 'Neural Timeline Calendar',
        body:
          'The calendar shows every day that had patient screening activity. ' +
          'We will select a day with activity to load the Active Intelligence Feed.',
        target: '[data-tour-id="neural-timeline-calendar"]',
        placement: 'right',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        spotlightPadding: 24,
      },
      {
        id: 'navigate-to-march',
        title: 'Navigate to a Month with Screenings',
        body:
          'If your current month has no screenings (for example, April), click the left month-arrow once to go back to March. ' +
          'The tour highlights the arrow—use the month arrows to move between months until you see screening tiles.',
        target: '[data-tour-id="neural-timeline-prev-month"]',
        placement: 'right',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        action: 'click',
        spotlightPadding: 8,
      },
      {
        id: 'select-date',
        title: 'Select a Screening Date',
        body:
          'Now click any day tile that has screening activity (data-has-data="true") to load the Active Intelligence Feed. ' +
          'If you are not yet in March, click the left month-arrow to move between months first.',
        target: '[data-tour-id="neural-timeline-day"][data-has-data="true"]',
        placement: 'right',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        action: 'click',
      },
      {
        id: 'active-intelligence-feed',
        title: 'Active Intelligence Feed',
        body:
          'After selecting a date, the right panel shows daily intelligence including geographic distribution.',
        target: '[data-tour-id="active-intelligence-feed-panel"]',
        placement: 'left',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        spotlightPadding: 10,
      },
      {
        id: 'geo-distribution',
        title: 'Geographic Case Distribution',
        body:
          'Scroll down to the Geographic Case Distribution section. ' +
          'States are shown as expandable cards (drawers). We will drill down ' +
          'from state → district → facility → patient.',
        target: '[data-tour-id="geo-case-distribution"]',
        placement: 'left',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        spotlightPadding: 4,
      },
      {
        id: 'state-drawer',
        title: 'Expand a State to See Districts',
        body:
          'Click a state card (for example, "Madhya Pradesh") to expand its districts.',
        target: '[data-tour-id="state-drawer"]',
        placement: 'left',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        action: 'click',
      },
      {
        id: 'district-drawer',
        title: 'Open a District to See Facilities',
        body:
          'Click a district drawer inside the selected state to reveal its facilities.',
        target: '[data-tour-id="district-drawer"]',
        placement: 'left',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        action: 'click',
      },
      {
        id: 'facility-drawer',
        title: "Open a Facility's Patient List",
        body:
          'Click a facility card to open the Patient List panel for that facility.',
        target: '[data-tour-id="facility-card"]',
        placement: 'left',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        action: 'click',
      },
      {
        id: 'patient-list',
        title: 'Patient List Panel',
        body:
          'This panel lists all patients for the selected facility. ' +
          'Scroll through the list to see patient cards.',
        target: '[data-tour-id="patient-list-panel"]',
        placement: 'left',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        spotlightPadding: 10,
      },
      {
        id: 'open-patient-record',
        title: "Open a Patient Record",
        body:
          'Click any patient card to open their detail drawer. ' +
          'We will update clinical information in the next steps.',
        target: '[data-tour-id="patient-card"]',
        placement: 'left',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        action: 'click',
        spotlightPadding: 8,
      },
      {
        id: 'clinical-sputum',
        title: 'Clinical Tab — Sputum & Referral',
        body:
          'The Clinical tab is the primary update area. Under "Sputum & Referral" you can set ' +
          'the Referral Date and Referred Facility.',
        target: '[data-tour-id="sputum-referral-section"]',
        placement: 'left',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        spotlightPadding: 8,
      },
      {
        id: 'clinical-diagnosis',
        title: 'Record the Diagnosis',
        body:
          'Scroll to the Diagnosis section and set "TB Diagnosed" and the Date of Diagnosis.',
        target: '[data-tour-id="diagnosis-section"]',
        placement: 'left',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
      },
      {
        id: 'clinical-att',
        title: 'ATT Initiation & Completion',
        body:
          'If applicable, record the ATT initiation Start Date and the Completion Date.',
        target: '[data-tour-id="att-initiation-section"]',
        placement: 'left',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
      },
      {
        id: 'submit-or-close',
        title: 'Submit Update or Close the Loop',
        body:
          'Click "Submit Clinical Update" to save changes. If the sputum result is negative, ' +
          'click "Close Loop (Not TB)".',
        target: '[data-tour-id="submit-clinical-update"]',
        placement: 'top',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
      },
      {
        id: 'admin-journey-tab',
        title: 'Admin & Journey Tab',
        body:
          'Switch to the "Admin & Journey" tab to view and edit patient timeline history.',
        target: '[data-tour-id="admin-journey-tab"]',
        placement: 'bottom',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        action: 'click',
      },
      {
        id: 'demographics-tab',
        title: 'Demographics Tab',
        body:
          'Open the Demographics tab to correct any data errors when needed.',
        target: '[data-tour-id="demographics-tab"]',
        placement: 'bottom',
        route: '/dashboard/vertex',
        navigateTo: '/dashboard/vertex',
        action: 'click',
      },
      {
        id: 'completion',
        title: "You're All Set!",
        body:
          'You have completed the full clinical update workflow.',
        target: null,
        placement: 'center',
        route: '/dashboard/vertex',
      },
    ],
  },

  // TOUR 2: "Navigate the Command Hub"
  {
    id: 'command-hub-tour',
    title: 'Navigate the Command Hub',
    description: 'A comprehensive tour of the Command Hub dashboard and its key features.',
    category: 'navigation',
    estimatedMinutes: 5,
    enabled: true,
    steps: [
      {
        id: 'intro',
        target: null,
        route: '/dashboard/command-hub',
        title: 'Welcome to SAMADHAAN',
        body: "Welcome to SAMADHAAN! This tour will guide you through the Command Hub dashboard and its key features. This takes about 5 minutes.",
        placement: 'center',
      },
      {
        id: 'kpi-bar',
        target: '[data-tour-id="kpi-dashboard-bar"]',
        route: '/dashboard/command-hub',
        title: 'KPI Dashboard Bar',
        body: "This bar shows key performance indicators at a glance, including today's screenings, AI flags, and confirmed cases.",
        placement: 'bottom',
      },
      {
        id: 'kpi-screened',
        target: '[data-tour-id="kpi-screened"]',
        route: '/dashboard/command-hub',
        title: 'Today Screened',
        body: "This tile shows the number of patients screened today across all facilities.",
        placement: 'bottom',
      },
      {
        id: 'kpi-flagged',
        target: '[data-tour-id="kpi-flagged"]',
        route: '/dashboard/command-hub',
        title: 'AI Flagged',
        body: "This tile shows the number of patients flagged by the AI screening system for clinical review.",
        placement: 'bottom',
      },
      {
        id: 'pipeline-embed',
        target: '[data-tour-id="pipeline-embed"]',
        route: '/dashboard/command-hub',
        title: 'Pipeline Embed',
        body: "This embedded view shows the patient pipeline with real-time updates on screening, triage, and follow-up status.",
        placement: 'right',
      },
      {
        id: 'program-mission',
        target: '[data-tour-id="program-mission"]',
        route: '/dashboard/command-hub',
        title: 'Program Mission',
        body: "This banner displays the program's mission and objectives, providing context for the screening initiative.",
        placement: 'bottom',
      },
      {
        id: 'journey-cube',
        target: '[data-tour-id="journey-cube"]',
        route: '/dashboard/command-hub',
        title: 'Screening Journey Cube',
        body: "This interactive cube visualizes the inmate screening journey through 4 key steps. Scroll to rotate through the faces.",
        placement: 'bottom',
      },
      {
        id: 'patient-timeline',
        target: '[data-tour-id="patient-timeline"]',
        route: '/dashboard/command-hub',
        title: 'Patient Timeline',
        body: "This timeline shows the patient journey from screening to confirmation with key milestones and status updates.",
        placement: 'bottom',
      },
      {
        id: 'maze-grid',
        target: '[data-tour-id="maze-grid"]',
        route: '/dashboard/command-hub',
        title: 'Module Maze Grid',
        body: "This grid provides quick access to all major modules including Analytics, GIS, M&E Tools, and Knowledge Vault.",
        placement: 'bottom',
      },
      {
        id: 'command-footer',
        target: '[data-tour-id="command-footer"]',
        route: '/dashboard/command-hub',
        title: 'Command Footer',
        body: "The footer provides system status indicators and quick links to support resources.",
        placement: 'top',
      },
      {
        id: 'completion',
        target: null,
        route: '/dashboard/command-hub',
        title: "You're Ready! ✓",
        body: "You've completed the Command Hub tour. You're now ready to use SAMADHAAN effectively!",
        placement: 'center',
      },
    ],
  },

  // TOUR 3: "Read the GIS Hotspot Map"
  {
    id: 'read-gis-map',
    title: 'Read the GIS Hotspot Map',
    description: 'Learn how to interpret and use the GIS hotspot map for spatial analysis of TB cases.',
    category: 'analytics',
    estimatedMinutes: 3,
    enabled: true,
    steps: [
      {
        id: 'intro',
        target: null,
        route: '/dashboard/command-hub',
        title: 'Read the GIS Hotspot Map',
        body: 'This guide will walk you through using the GIS hotspot map for spatial analysis. This takes about 3 minutes.',
        placement: 'center',
      },
      {
        id: 'navigate-gis',
        target: '[data-tour-id="sidebar-gis"]',
        route: '/dashboard/command-hub',
        navigateTo: '/dashboard/gis',
        title: 'Navigate to GIS',
        body: "Click the GIS tab in the sidebar to open the geographic intelligence module.",
        placement: 'right',
        action: 'click',
      },
      {
        id: 'completion',
        target: null,
        route: '/dashboard/gis',
        title: "All Done! ✓",
        body: "You now know how to access the GIS hotspot map for spatial analysis.",
        placement: 'center',
      },
    ],
  },

  // TOUR 4: "Set M&E Targets"
  {
    id: 'set-mne-targets',
    title: 'Set M&E Targets',
    description: 'Learn how to set and track Monitoring & Evaluation targets for screening programs.',
    category: 'clinical',
    estimatedMinutes: 4,
    enabled: true,
    steps: [
      {
        id: 'intro',
        target: null,
        route: '/dashboard/command-hub',
        title: 'Set M&E Targets',
        body: 'This guide will walk you through setting M&E targets. This takes about 4 minutes.',
        placement: 'center',
      },
      {
        id: 'navigate-mne',
        target: '[data-tour-id="sidebar-mne"]',
        route: '/dashboard/command-hub',
        navigateTo: '/dashboard/mande',
        title: 'Navigate to M&E',
        body: "Click the M&E Tools tab in the sidebar to open the Monitoring & Evaluation module.",
        placement: 'right',
        action: 'click',
      },
      {
        id: 'completion',
        target: null,
        route: '/dashboard/mande',
        title: "All Done! ✓",
        body: "You now know how to access the M&E Tools module for target management.",
        placement: 'center',
      },
    ],
  },

  // TOUR 5: "Understanding Your Dashboard for the First Time"
  {
    id: 'first-time-user',
    title: 'Understanding Your Dashboard for the First Time',
    description: 'A comprehensive welcome tour covering every major element of the UI with operational insights.',
    category: 'navigation',
    estimatedMinutes: 7,
    enabled: true,
    steps: [
      {
        id: 'intro',
        target: null,
        route: '/dashboard/command-hub',
        title: 'Welcome to SAMADHAAN Health OS',
        body: "Welcome to SAMADHAAN — the National Integrated Prison & OCS TB Surveillance System. This comprehensive tour will introduce you to all major features of your command dashboard. You'll learn how to monitor screening operations, track patient flow, and access critical intelligence. This takes about 7 minutes.",
        placement: 'center',
      },
      {
        id: 'kpi-bar-explanation',
        target: '[data-tour-id="kpi-dashboard-bar"]',
        route: '/dashboard/command-hub',
        title: 'KPI Dashboard Bar — Your Daily Command Signal',
        body: "This KPI strip is your daily command signal. Check 'Screened' vs 'AI Flagged' first to estimate workload and triage pressure before opening any module. The 'Confirmed' count shows your program's detection rate. Operator insight: If AI Flagged exceeds 15% of Screened, expect high clinical review demand today.",
        placement: 'bottom',
        spotlightPadding: 12,
      },
      {
        id: 'pipeline-embed-detail',
        target: '[data-tour-id="pipeline-embed"]',
        route: '/dashboard/command-hub',
        title: 'Live Pipeline Embed — Real-Time Patient Flow',
        body: "This embedded view shows real-time patient flow through screening, triage, and confirmation stages. Watch for bottlenecks: if 'Pending Follow-up' grows faster than 'Confirmed', your clinical team may need support. Operator insight: Use this to prioritize daily resource allocation across facilities.",
        placement: 'right',
        spotlightPadding: 10,
      },
      {
        id: 'program-mission-context',
        target: '[data-tour-id="program-mission"]',
        route: '/dashboard/command-hub',
        title: 'Program Mission Banner — Strategic Context',
        body: "This banner provides strategic context about the screening program's mission and RNTCP alignment. It reminds your team of the national TB elimination goals and correctional facility priorities. Operator insight: Reference this when onboarding new staff or explaining program scope to stakeholders.",
        placement: 'bottom',
        spotlightPadding: 8,
      },
      {
        id: 'screening-journey-explanation',
        target: '[data-tour-id="journey-cube"]',
        route: '/dashboard/command-hub',
        title: 'Screening Journey Cube — 4-Step Pathway',
        body: "This interactive cube visualizes the inmate screening journey through 4 key steps: Symptom Screening → X-Ray Capture → AI Analysis → Clinical Confirmation. Scroll to rotate through each face and see expected timelines. Operator insight: Use this to train field coordinators on the complete pathway and identify where delays occur.",
        placement: 'bottom',
        spotlightPadding: 10,
      },
      {
        id: 'patient-timeline-detail',
        target: '[data-tour-id="patient-timeline"]',
        route: '/dashboard/command-hub',
        title: 'Patient Timeline — Journey Milestones',
        body: "This timeline shows the patient journey from initial screening to final confirmation with key milestones and SLA targets. Each stage has a target duration (e.g., X-Ray within 24h, CBNAAT within 48h). Operator insight: If most patients exceed these targets, investigate facility-level bottlenecks using the GIS Map.",
        placement: 'bottom',
        spotlightPadding: 10,
      },
      {
        id: 'module-grid-overview',
        target: '[data-tour-id="maze-grid"]',
        route: '/dashboard/command-hub',
        title: 'Module Maze Grid — Quick Access Hub',
        body: "This grid provides quick access to all major modules: Analytics (trends), GIS (spatial hotspots), M&E Tools (targets), Knowledge Vault (SOPs), and more. Each tile is a spring-physics button with hover lift. Operator insight: Bookmark this page as your daily starting point — all critical tools are one click away.",
        placement: 'bottom',
        spotlightPadding: 10,
      },
      {
        id: 'knowledge-vault-intro',
        target: '[data-tour-id="sidebar-docs"]',
        route: '/dashboard/command-hub',
        navigateTo: '/dashboard/command-hub',
        action: 'click',
        title: 'Knowledge Vault — SOPs & Technical Guides',
        body: "The Knowledge Vault contains 42 complete articles covering SOPs, user manuals, clinical protocols, and technical references. Use Cmd/Ctrl+K to search instantly. Operator insight: When training new users, send them here first — every feature has a detailed guide with screenshots and best practices.",
        placement: 'right',
        spotlightPadding: 8,
      },
      {
        id: 'knowledge-vault-home',
        target: '#kv-search-home',
        route: '/docs',
        navigateTo: '/docs',
        title: 'Inside Knowledge Vault',
        body: "You are now inside the Knowledge Vault. Use this search bar to quickly find SOPs, user manuals, and technical guides by keyword.",
        placement: 'bottom',
        spotlightPadding: 8,
      },
      {
        id: 'completion',
        target: null,
        route: '/docs',
        title: "You're Ready to Use SAMADHAAN! ✓",
        body: "Congratulations! You've completed the comprehensive dashboard tour. You now understand the KPI bar, pipeline flow, screening journey, and module access points. Next steps: Explore the Knowledge Vault for detailed guides, check the GIS Map for spatial insights, and review M&E Tools for your facility targets. Welcome to the SAMADHAAN Health OS.",
        placement: 'center',
      },
    ],
  },

  // DISABLED TOURS (Follow-up Pipeline Removed)
  
  // TOUR [DISABLED]: "Triage an AI-Flagged Patient"
  {
    id: 'triage-ai-flag',
    title: 'Triage an AI-Flagged Patient',
    description: '[DISABLED] Follow-up Pipeline has been removed from navigation.',
    category: 'pipeline',
    estimatedMinutes: 4,
    enabled: false,
    steps: [
      {
        id: 'intro',
        target: null,
        route: '/dashboard/command-hub',
        title: 'Tour Unavailable',
        body: 'This tour is no longer available as the Follow-up Pipeline tab has been removed from the system.',
        placement: 'center',
      },
    ],
  },

  // TOUR [DISABLED]: "Mark a Patient as LTFU"
  {
    id: 'mark-ltfu',
    title: 'Mark a Patient as LTFU',
    description: '[DISABLED] Follow-up Pipeline has been removed from navigation.',
    category: 'pipeline',
    estimatedMinutes: 3,
    enabled: false,
    steps: [
      {
        id: 'intro',
        target: null,
        route: '/dashboard/command-hub',
        title: 'Tour Unavailable',
        body: 'This tour is no longer available as the Follow-up Pipeline tab has been removed from the system.',
        placement: 'center',
      },
    ],
  },

  // TOUR [DISABLED]: "Export a Monthly Screening Report"
  {
    id: 'export-monthly-report',
    title: 'Export a Monthly Screening Report',
    description: '[DISABLED] Export features not yet implemented.',
    category: 'analytics',
    estimatedMinutes: 2,
    enabled: false,
    steps: [
      {
        id: 'intro',
        target: null,
        route: '/dashboard/command-hub',
        title: 'Tour Unavailable',
        body: 'This tour is no longer available as export features are not yet implemented in the M&E module.',
        placement: 'center',
      },
    ],
  },

  // TOUR [DISABLED]: "Add a New User"
  {
    id: 'add-new-user',
    title: 'Add a New User',
    description: '[DISABLED] Admin panel not accessible via sidebar.',
    category: 'admin',
    estimatedMinutes: 4,
    enabled: false,
    steps: [
      {
        id: 'intro',
        target: null,
        route: '/dashboard/command-hub',
        title: 'Tour Unavailable',
        body: 'This tour is no longer available as the Identity Bureau is not accessible via the main sidebar navigation.',
        placement: 'center',
      },
    ],
  },
]
