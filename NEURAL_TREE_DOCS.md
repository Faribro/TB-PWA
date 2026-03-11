# Neural Tree Mind Map Dashboard

## Architecture Overview

The Neural Tree Dashboard replaces traditional table views with a hierarchical spatial navigation system that handles 14,000+ records with fluid animations and real-time filtering.

## Components Created

### 1. **TreeFilterContext** (`contexts/TreeFilterContext.tsx`)
Global state management for tree-based filtering.

```tsx
interface TreeFilter {
  year?: number;
  month?: number;
  date?: string;
  actionType?: 'sputum' | 'diagnosis' | 'treatment' | 'admin';
}
```

### 2. **MindMapDashboard** (`components/MindMapDashboard.tsx`)
The main neural tree visualization with three hierarchical levels:

**Level 1 - Yearly Trunk:**
- Horizontal nodes for each year
- Shows 3 glowing stats: Screened (Cyan), Diagnosed (Purple), Pending (Amber)
- Glassmorphism design with backdrop-blur-2xl
- Hover effects with radial gradients

**Level 2 - Monthly Branches:**
- Expands on year click with animated SVG connectors
- Smooth path animations using stroke-dasharray
- Shows aggregated monthly stats

**Level 3 - Daily Heatmap:**
- GitHub-style contribution calendar
- Days with pending actions pulse with crimson glow
- Click to open Action Leaf overlay

**Action Leaf Overlay:**
Full-screen glass overlay with 4 interactive quadrants:
- Sputum & Referral (Cyan, Activity icon)
- Diagnosis Update (Emerald, Stethoscope icon)
- Treatment Update (Purple, Pill icon)
- Administration (Slate, Shield icon)

### 3. **FollowUpPipeline** (`components/FollowUpPipeline.tsx`)
Synchronized patient list that filters based on tree selection.

Features:
- Real-time filtering based on TreeFilter context
- AnimatePresence for smooth list transitions
- Phase-based color coding
- Click to open patient details

### 4. **SpatialBreadcrumb** (`components/SpatialBreadcrumb.tsx`)
Visual breadcrumb showing current filter path with reset button.

Example: `2026 > March > Week 2 > Diagnosis`

## Usage

### Basic Integration

```tsx
import { TreeFilterProvider } from '@/contexts/TreeFilterContext';
import MindMapDashboard from '@/components/MindMapDashboard';
import { FollowUpPipeline } from '@/components/FollowUpPipeline';

export default function Page() {
  const { data: patients } = useSWRAllPatients();

  return (
    <TreeFilterProvider>
      <div className="h-screen flex">
        <div className="flex-1">
          <MindMapDashboard patients={patients} />
        </div>
        <div className="w-2/5">
          <FollowUpPipeline patients={patients} />
        </div>
      </div>
    </TreeFilterProvider>
  );
}
```

### Accessing Filter State

```tsx
import { useTreeFilter } from '@/contexts/TreeFilterContext';

function MyComponent() {
  const { filter, setFilter, clearFilter } = useTreeFilter();
  
  // Filter structure:
  // { year: 2026, month: 2, date: '2026-03-12', actionType: 'diagnosis' }
}
```

## Motion Design

All animations use framer-motion:

- **layoutId**: Morphs elements during drill-down
- **AnimatePresence**: Smooth mount/unmount
- **whileHover/whileTap**: Interactive feedback
- **SVG path animations**: Data flow visualization

## Visual Language

- **Background**: `bg-slate-950` with radial gradients
- **Glass Cards**: `backdrop-blur-2xl bg-white/5 border border-white/10`
- **Accent Colors**:
  - Cyan: Screening/Sputum
  - Purple: Diagnosis
  - Emerald: Treatment
  - Amber: Pending actions
  - Red: Overdue (pulsing)

## Data Flow

```
User clicks Year
  ↓
MindMapDashboard updates expandedYear state
  ↓
SVG connectors animate in
  ↓
Month nodes render with stagger
  ↓
User clicks Month
  ↓
Heatmap calendar renders
  ↓
User clicks Date
  ↓
Action Leaf overlay opens
  ↓
User clicks Action Type
  ↓
setFilter({ year, month, date, actionType })
  ↓
FollowUpPipeline re-filters patients
  ↓
SpatialBreadcrumb displays filter path
```

## Performance Optimizations

1. **useMemo** for tree data calculation
2. **d3.hierarchy** for efficient tree structure
3. **AnimatePresence mode="popLayout"** for list animations
4. **Staggered animations** with delay multipliers
5. **Conditional rendering** based on expansion state

## Customization

### Changing Colors

Edit the ACTION_TYPES array in MindMapDashboard.tsx:

```tsx
const ACTION_TYPES = [
  { id: 'sputum', label: 'Custom Label', icon: YourIcon, color: 'blue' }
];
```

### Adjusting Animation Speed

Modify transition durations:

```tsx
transition={{ duration: 0.5 }} // SVG paths
transition={{ delay: idx * 0.1 }} // Stagger delay
```

### Adding New Filter Levels

Extend TreeFilter interface:

```tsx
interface TreeFilter {
  year?: number;
  month?: number;
  date?: string;
  week?: number; // New level
  actionType?: string;
}
```

## Integration with Existing Dashboard

To replace CommandCenter with Neural Tree:

1. Wrap your app with TreeFilterProvider
2. Replace the main dashboard component with MindMapDashboard
3. Add FollowUpPipeline to sidebar
4. Use useTreeFilter() in other components to access filter state

## Demo Route

Visit `/neural-dashboard` to see the complete integration.

## Dependencies

- `d3` (v7.9.0) - Tree hierarchy calculations
- `framer-motion` (v12.35.0) - Animations
- `lucide-react` - Icons
- `swr` - Data fetching

All dependencies are already installed in package.json.
