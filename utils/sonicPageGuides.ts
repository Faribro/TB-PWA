export interface GuideSection {
  heading: string;
  content: string;
  tip?: string;
}

export interface PageGuide {
  title: string;
  quickSummary: string;
  sections: GuideSection[];
}

export const PAGE_GUIDES_EN: Record<string, PageGuide> = {
  '/dashboard': {
    title: 'Dashboard Overview',
    quickSummary: 'The Dashboard shows total screenings, breach counts, data health score, and duplicates across all districts. Check the four stat cards at the top first.',
    sections: [
      {
        heading: 'Four stat cards',
        content: 'Total Screened, Breach Count, Data Health Score, Duplicate Count. Each card is clickable to drill down.',
        tip: 'If Breach Count is red, go to Follow-up Pipeline immediately.',
      },
      {
        heading: 'District cards',
        content: 'Each district card shows screened count, breach rate, and health score. Green is safe, yellow needs attention, red is critical.',
        tip: 'Click any district card to fly to it on the GIS Map.',
      },
      {
        heading: 'Month filter bar',
        content: 'Use the month selector at the top to switch reporting periods. All cards update instantly.',
      },
      {
        heading: 'Sidebar navigation',
        content: 'Use the left sidebar to access GIS Map, M&E Hub, Follow-up Pipeline, and Vertex. Active page is highlighted in cyan.',
      },
    ],
  },

  '/dashboard/gis': {
    title: 'GIS Map',
    quickSummary: 'The GIS Map shows every district as a colored bubble. Larger and redder bubbles mean more breaches and higher risk.',
    sections: [
      {
        heading: 'Bubble map',
        content: 'Circle size shows breach volume. Color shows risk: green low, yellow moderate, red critical.',
        tip: 'Click any bubble to zoom into that district.',
      },
      {
        heading: 'Metric switcher',
        content: 'Toggle between Breaches, Screened, and Health Score views using the switcher top right.',
      },
      {
        heading: 'Leaderboard',
        content: 'Click Leaderboard to rank all districts best to worst by breach rate, screening count, or health score.',
        tip: 'Districts at the bottom need field visits first.',
      },
      {
        heading: 'Cascade Funnel',
        content: 'Shows the TB pipeline: Presumptive → Tested → Diagnosed → Treatment Started → Completed.',
        tip: 'Large drop between Tested and Diagnosed means a lab reporting gap.',
      },
      {
        heading: 'Sonic commands',
        content: 'Type a district name in the Sonic panel to fly to it. Try "Show Pune" or "Worst district".',
      },
    ],
  },

  '/dashboard/mande': {
    title: 'M&E Intelligence Hub',
    quickSummary: 'The M&E Hub detects duplicate patient records, validates data quality, and tracks program performance across all districts.',
    sections: [
      {
        heading: 'Duplicate detection table',
        content: 'Lists suspected duplicates with Patient Name, NIKSHAY ID, Age, District, Submitted By, and Match Score columns.',
        tip: 'Sort by Match Score descending to see most critical duplicates first.',
      },
      {
        heading: 'Merge and Dismiss buttons',
        content: 'Merge combines two records into one. Dismiss marks the pair as not a duplicate. Merge cannot be undone.',
        tip: 'Always verify with field staff before merging if NIKSHAY IDs differ.',
      },
      {
        heading: 'Data Health Score card',
        content: 'Shows a 0 to 100 score. Deducted for duplicates, missing fields, and late submissions. Click to see which issues drag the score down.',
      },
      {
        heading: 'Performance metrics panel',
        content: 'District-wise screening rates, case detection rates, and treatment success rates. Red bars mean below target.',
        tip: 'Click any district row to drill into individual data quality issues.',
      },
    ],
  },

  '/dashboard/follow-up': {
    title: 'Follow-up Pipeline',
    quickSummary: 'The Follow-up Pipeline shows all patients who need action sorted by priority. Use it daily to ensure no patient is missed.',
    sections: [
      {
        heading: 'Patient queue table',
        content: 'Lists patients requiring follow-up with columns: Name, NIKSHAY ID, Action Type, Due Date, District, and Status.',
        tip: 'Sort by Due Date ascending to see the most overdue patients first.',
      },
      {
        heading: 'Action type filter',
        content: 'Filter patients by type: Presumptive, Diagnosed, Started Treatment, or Lost to Follow-up. Each type needs a different action.',
      },
      {
        heading: 'Bulk triage button',
        content: 'Select multiple patients using checkboxes, then click Bulk Triage to assign them to a field worker at once.',
        tip: 'Use bulk triage every Monday morning to distribute the weekly workload.',
      },
      {
        heading: 'Date and district filter',
        content: 'Use the date range picker and district dropdown at the top to narrow down which patients to action today.',
      },
    ],
  },

  '/dashboard/vertex': {
    title: 'Vertex Neural Network',
    quickSummary: 'Vertex is an AI-powered 3D visualization showing patient connections and risk patterns as an interactive neural network.',
    sections: [
      {
        heading: '3D node graph',
        content: 'Each glowing node is a patient. Node color shows risk level: blue low, orange medium, red high. Lines between nodes show shared risk factors.',
        tip: 'Click any node to see that patient\'s full AI risk profile.',
      },
      {
        heading: 'Navigation controls',
        content: 'Click and drag to rotate the 3D space. Scroll to zoom in and out. Right-click and drag to pan.',
      },
      {
        heading: 'AI risk score panel',
        content: 'When you click a node, a side panel shows the AI-generated risk score, contributing factors, and recommended next action.',
      },
      {
        heading: 'Cluster filter',
        content: 'Use the cluster dropdown to filter nodes by district, risk level, or treatment stage. This isolates specific patient groups for analysis.',
        tip: 'Filter by "High Risk + No Treatment Started" to find the most urgent patients.',
      },
    ],
  },
};
