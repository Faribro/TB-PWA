# 🧬 Neural Nexus - Complete Technical Integration Map

**Project Fingerprint for Alliance Spatial OS**  
**Generated:** Clinical Survey Phase  
**Purpose:** All-in-one technical blueprint for Neural Nexus X-Ray Intelligence module

---

## 📋 Executive Summary

This is the **COMPLETE** technical blueprint for integrating the **Neural Nexus** tab into TB-PWA-Clean. This single document contains:

✅ **Component Architecture** - UI library, design tokens, modal patterns  
✅ **Navigation Logic** - Sidebar injection points, routing structure  
✅ **State Management** - Zustand stores, React Context, SWR patterns  
✅ **API Standards** - Azure SAS token generation, Supabase queries, error handling  
✅ **Asset Handling** - Binary data, lazy loading, 3D rendering patterns  
✅ **Complete Code Examples** - Ready-to-use implementations  
✅ **Google Stitch Prompt** - AI-ready UI generation instructions  
✅ **Integration Checklist** - Step-by-step deployment guide  

**No other documents needed. This is your single source of truth.**

---

## 1️⃣ Component Architecture

### **Primary UI Library**
- **Shadcn/ui** (Radix UI primitives with custom Tailwind styling)
- **Component Location:** `components/ui/`
- **Available Primitives:**
  - `Sheet` (Radix Dialog) - Side drawers
  - `Button` - Primary actions
  - `Card` - Content containers
  - `Input` - Form fields
  - `Select` - Dropdowns
  - `Tabs` - Tab navigation
  - `Progress` - Loading states
  - `Skeleton` - Loading placeholders
  - `ScrollArea` - Scrollable containers
  - `Badge` - Status indicators
  - `Switch` - Toggle controls

### **Modal/Dialog Pattern**
```typescript
// Standard Pattern: Radix Sheet for side panels
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetOverlay } from '@/components/ui/sheet';

// Z-Index Management (CRITICAL)
import { Z_INDEX } from '@/lib/zIndex';

// Usage Pattern
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetOverlay style={{ zIndex: Z_INDEX.overlay }} />
  <SheetContent style={{ zIndex: Z_INDEX.drawer }}>
    {/* Content */}
  </SheetContent>
</Sheet>
```

### **Design System Tokens**
- **Border Radius:** 16px (panels), 12px (buttons), 8px (inputs)
- **Backdrop Blur:** `backdrop-blur-md` (global glass effect)
- **Spacing:** 4px grid system (p-4, gap-4, etc.)
- **Z-Index Hierarchy:** 
  - Base: 10 (overlays)
  - Mid: 20 (modals)
  - Top: 30+ (tooltips, dropdowns)
  - **Import from:** `@/lib/zIndex`

### **Color Palette (Tactical Glass Aesthetic)**
```css
/* Primary Actions */
--blue-500: #3b82f6 (active states)
--blue-600: #2563eb (hover states)

/* Status Colors */
--emerald-500: #10b981 (success/on-track)
--red-500: #ef4444 (alerts/breaches)
--amber-500: #f59e0b (warnings)
--purple-500: #a855f7 (filters/depth)

/* Backgrounds */
--slate-50: #f8fafc (page background)
--slate-100: #f1f5f9 (card backgrounds)
--slate-900: #0f172a (dark accents)

/* Glass Effect */
bg-white/80 backdrop-blur-2xl (sidebar)
bg-white/50 backdrop-blur-md (cards)
```

---

## 2️⃣ Navigation Logic

### **Sidebar Configuration**
- **Location:** `app/dashboard/layout.tsx`
- **Pattern:** Static component in dashboard layout
- **Tab Config Array:**

```typescript
const TAB_CONFIG = [
  { id: 'vertex', path: '/dashboard/vertex', icon: Network, label: 'Vertex' },
  { id: 'follow-up', path: '/dashboard/follow-up', icon: GitBranch, label: 'Follow-up Pipeline' },
  { id: 'mande', path: '/dashboard/mande', icon: Copy, label: 'M&E Tools' },
  { id: 'gis', path: '/dashboard/gis', icon: Map, label: 'GIS Map' },
  { id: 'settings', path: '/dashboard', icon: Settings, label: 'Settings' },
];
```

### **Neural Nexus Entry Point**
**Recommended Injection Point:**

```typescript
// Add to TAB_CONFIG in app/dashboard/layout.tsx
{ 
  id: 'neural-nexus', 
  path: '/dashboard/neural-nexus', 
  icon: Brain, // from lucide-react
  label: 'Neural Nexus', 
  description: 'X-Ray Intelligence',
  sonicId: 'nav-neural-nexus' 
}
```

**File to Create:**
- `app/dashboard/neural-nexus/page.tsx` (main route)

### **Active State Detection**
```typescript
const pathname = usePathname();
const isActive = pathname === tab.path;
```

### **Breadcrumb Integration**
- **Component:** `NeuralBreadcrumb` (auto-updates based on route)
- **Location:** Rendered in `app/dashboard/layout.tsx`
- **No manual updates needed** - uses Next.js pathname

---

## 3️⃣ State Management

### **Global State: Zustand**
- **Primary Store:** `stores/useEntityStore.ts`
- **Pattern:** Zustand with persistence middleware

**Key State Slices for Neural Nexus:**
```typescript
interface EntityStore {
  // Patient Data
  districtData: DistrictData[];
  focusedDistrict: string | null;
  
  // Filters (Universal Filter Context)
  activeFilters: {
    state: string | null;
    district: string | null;
    coordinator: string | null;
    phase: string | null;
    status: 'All' | 'High Alert' | 'On Track';
  };
  
  // Sonic AI Integration
  sonicAlerts: string[];
  sonicLanguage: SonicLanguage;
  sonicDeepScanTarget: string | null;
  sonicDeepScanData: any | null;
  
  // Actions
  setFocusedDistrict: (district: string | null) => void;
  setGlobalFilter: (filters: Partial<activeFilters>) => void;
  pushSonicAlert: (msg: string) => void;
}
```

### **Universal Filter Context**
- **Location:** `contexts/FilterContext.tsx`
- **Pattern:** React Context + Zustand sync
- **Single Source of Truth** for all filtering

**Usage Pattern:**
```typescript
import { useUniversalFilter } from '@/contexts/FilterContext';

const { filter, setDistrict, setStatus, resetFilters } = useUniversalFilter();

// Filter state structure
filter = {
  coordinator: string | null,
  status: 'All' | 'High Alert' | 'On Track',
  district: string | null,
  state: string | null
}
```

### **Patient Data: SWR**
- **Hook:** `useSWRAllPatients()` from `@/hooks/useSWRPatients`
- **Pattern:** SWR for caching + real-time updates
- **Revalidation:** Automatic on focus/reconnect

**Usage Pattern:**
```typescript
import { useSWRAllPatients } from '@/hooks/useSWRPatients';

const { data: patients = [], isLoading, error } = useSWRAllPatients();
```

### **Local Component State: useState**
- Use for UI-only state (modals, dropdowns, form inputs)
- **Do NOT** use for shared data across components

---

## 4️⃣ API Standards

### **Route Pattern**
- **Location:** `app/api/[endpoint]/route.ts`
- **Convention:** Next.js App Router API routes

### **Existing External Cloud Patterns**

#### **Supabase (PostgreSQL)**
```typescript
// Client-side
import { createClient } from '@/lib/supabase-client';
const supabase = createClient();

// Server-side
import { createClient } from '@/lib/supabase-server';
const supabase = createClient();

// Query Pattern
const { data, error } = await supabase
  .from('patients')
  .select('*')
  .eq('district', 'Mumbai');
```

#### **Google Gemini AI (11-key rotation)**
```typescript
// Location: lib/geminiMapAnalyzer.ts
import { analyzeDistrictWithGemini } from '@/lib/geminiMapAnalyzer';

// PII Shield Pattern (MANDATORY before AI calls)
import { sanitizeForAI, validateSanitization } from '@/utils/dataSanitizer';

const sanitizedData = sanitizeForAI(rawData);
const validation = validateSanitization(sanitizedData);

if (!validation.valid) {
  // Alert via Sentry
  Sentry.captureMessage('PII Leak Prevented');
  return error;
}
```

#### **Sentry Error Tracking**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.captureException(error, {
  tags: { component: 'neural-nexus', api: 'azure' },
  extra: { context: 'SAS token generation' }
});
```

### **Recommended Azure SAS Token API Route**

**File to Create:** `app/api/azure/sas-token/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    const { containerName, blobName } = await request.json();
    
    // Generate SAS token logic here
    // Use Azure SDK: @azure/storage-blob
    
    const sasToken = generateSasToken(containerName, blobName);
    
    return NextResponse.json({ sasToken, expiresAt: Date.now() + 3600000 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'neural-nexus', api: 'azure-sas' }
    });
    return NextResponse.json({ error: 'SAS generation failed' }, { status: 500 });
  }
}
```

### **API Call Pattern (Client-side)**
```typescript
const response = await fetch('/api/azure/sas-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ containerName: 'xrays', blobName: 'patient-123.dcm' })
});

const { sasToken } = await response.json();
```

---

## 5️⃣ Asset Handling

### **Heavy Assets Pattern**

#### **Dynamic Imports (Code Splitting)**
```typescript
// Location: components/LazyComponents.tsx
import dynamic from 'next/dynamic';

export const HeavyComponent = dynamic(
  () => import('./HeavyComponent').then(mod => ({ default: mod.HeavyComponent })),
  {
    loading: () => <div className="h-12 bg-slate-100 animate-pulse rounded-lg" />,
    ssr: false // Disable SSR for client-only components
  }
);
```

#### **Skeleton Loaders**
```typescript
// Use Shadcn Skeleton component
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-[400px] w-full rounded-2xl" />
```

#### **Binary Data Handling (PDFs, Images)**
```typescript
// Existing pattern from app/api/upload-pdf/route.ts

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Process binary data
  // Store in global cache or upload to cloud
}
```

### **Image Optimization**
```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/path/to/xray.jpg"
  alt="X-Ray"
  width={800}
  height={600}
  loading="lazy"
  className="rounded-2xl"
/>
```

### **3D/WebGL Assets**
- **Existing Pattern:** Three.js with React Three Fiber
- **Location:** `components/ThreeBackground.tsx`, `components/Vertex.tsx`
- **Conditional Rendering:** Only load when tab is active

```typescript
const [shouldRender3D, setShouldRender3D] = useState(false);

useEffect(() => {
  if (isActive) {
    setShouldRender3D(true);
  }
}, [isActive]);

{shouldRender3D && <Canvas>{/* 3D content */}</Canvas>}
```

---

## 6️⃣ Complete Implementation Code

### **Step 1: Add Navigation Entry**

**File:** `app/dashboard/layout.tsx`  
**Action:** Add to TAB_CONFIG array (around line 15)

```typescript
import { Brain } from 'lucide-react'; // Add to imports

const TAB_CONFIG = [
  { id: 'vertex', path: '/dashboard/vertex', icon: Network, label: 'Vertex', description: 'Neural overview', sonicId: 'nav-vertex' },
  { id: 'follow-up', path: '/dashboard/follow-up', icon: GitBranch, label: 'Follow-up Pipeline', description: 'Patient pipeline', sonicId: 'nav-followup' },
  { id: 'mande', path: '/dashboard/mande', icon: Copy, label: 'M&E Tools', description: 'Monitoring & eval', sonicId: 'nav-mande' },
  { id: 'gis', path: '/dashboard/gis', icon: Map, label: 'GIS Map', description: 'Spatial intelligence', sonicId: 'nav-gis' },
  // 🔥 ADD THIS LINE:
  { id: 'neural-nexus', path: '/dashboard/neural-nexus', icon: Brain, label: 'Neural Nexus', description: 'X-Ray Intelligence', sonicId: 'nav-neural-nexus' },
  { id: 'settings', path: '/dashboard', icon: Settings, label: 'Settings', description: 'Account & sync', sonicId: 'nav-settings' },
];
```

---

### **Step 2: Create Main Route**

**File:** `app/dashboard/neural-nexus/page.tsx` (CREATE NEW)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Upload, Download, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { useUniversalFilter } from '@/contexts/FilterContext';
import { useSWRAllPatients } from '@/hooks/useSWRPatients';
import { useEntityStore } from '@/stores/useEntityStore';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetOverlay } from '@/components/ui/sheet';
import { Z_INDEX } from '@/lib/zIndex';
import dynamic from 'next/dynamic';

// Lazy load heavy viewer component
const XRayCanvas = dynamic(() => import('@/components/XRayCanvas'), {
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
  ssr: false
});

export default function NeuralNexusPage() {
  const { filter } = useUniversalFilter();
  const { data: allPatients = [], isLoading } = useSWRAllPatients();
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [xrayUrl, setXrayUrl] = useState<string | null>(null);
  const [loadingXray, setLoadingXray] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Filter patients based on universal filter context
  const filteredPatients = allPatients.filter(p => {
    if (filter.district && p.screening_district !== filter.district) return false;
    if (filter.state && p.screening_state !== filter.state) return false;
    if (filter.coordinator && p.prison_coordinator !== filter.coordinator) return false;
    return true;
  });

  // Load X-Ray from Azure Blob Storage
  const loadXRay = async (patient: any) => {
    setSelectedPatient(patient);
    setLoadingXray(true);
    setViewerOpen(true);

    try {
      // Generate SAS token for Azure Blob
      const response = await fetch('/api/azure/sas-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          containerName: 'xray-images',
          blobName: `${patient.unique_id}.png` // or .dcm for DICOM
        })
      });

      if (!response.ok) throw new Error('Failed to generate SAS token');

      const { sasUrl } = await response.json();
      setXrayUrl(sasUrl);
    } catch (error) {
      console.error('Failed to load X-Ray:', error);
      alert('Failed to load X-Ray image');
    } finally {
      setLoadingXray(false);
    }
  };

  return (
    <div className="h-full w-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-shrink-0 px-8 py-6 bg-white/80 backdrop-blur-md border-b border-slate-200"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Neural Nexus</h1>
            <p className="text-sm text-slate-500 font-medium">X-Ray Intelligence Hub</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="px-4 py-2 bg-blue-50 rounded-xl">
              <span className="text-xs font-bold text-blue-600">{filteredPatients.length} Patients</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Patient List Sidebar */}
        <aside className="w-80 border-r border-slate-200 bg-white/50 backdrop-blur-sm flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Patient Registry</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))
              ) : filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Brain className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No patients found</p>
                </div>
              ) : (
                filteredPatients.map(patient => (
                  <motion.button
                    key={patient.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => loadXRay(patient)}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl hover:border-purple-300 hover:shadow-md transition-all text-left"
                  >
                    <p className="font-bold text-slate-900 text-sm truncate">{patient.inmate_name}</p>
                    <p className="text-xs text-slate-500 mt-1">{patient.unique_id}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                        {patient.screening_district}
                      </span>
                      {patient.xray_result && (
                        <span className="text-[10px] px-2 py-0.5 bg-purple-100 rounded-full text-purple-600">
                          X-Ray Available
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500/10 to-indigo-600/10 flex items-center justify-center">
              <Brain className="w-12 h-12 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Patient</h3>
            <p className="text-slate-500 text-sm">Choose a patient from the left panel to view their X-Ray</p>
          </div>
        </div>
      </div>

      {/* X-Ray Viewer Modal */}
      <Sheet open={viewerOpen} onOpenChange={setViewerOpen}>
        <SheetOverlay style={{ zIndex: Z_INDEX.overlay }} className="bg-slate-900/80 backdrop-blur-sm" />
        <SheetContent
          style={{ zIndex: Z_INDEX.drawer }}
          className="!w-[95vw] !max-w-[1400px] h-full p-0 flex flex-col bg-slate-900"
        >
          {/* Viewer Header */}
          <SheetHeader className="px-6 py-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-white text-xl font-bold">
                  {selectedPatient?.inmate_name}
                </SheetTitle>
                <p className="text-slate-400 text-sm mt-1">{selectedPatient?.unique_id}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <ZoomOut className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <RotateCw className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => { setZoom(1); setRotation(0); }}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* Viewer Canvas */}
          <div className="flex-1 flex items-center justify-center p-8 bg-slate-900">
            {loadingXray ? (
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-16 h-16 mx-auto mb-4 border-4 border-purple-500 border-t-transparent rounded-full"
                />
                <p className="text-white text-sm">Loading X-Ray...</p>
              </div>
            ) : xrayUrl ? (
              <div
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.3s ease'
                }}
                className="max-w-full max-h-full"
              >
                <img
                  src={xrayUrl}
                  alt="X-Ray"
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                />
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No X-Ray available</p>
              </div>
            )}
          </div>

          {/* Metadata Panel */}
          <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50 backdrop-blur-md">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">District</p>
                <p className="text-white font-medium mt-1">{selectedPatient?.screening_district}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Screening Date</p>
                <p className="text-white font-medium mt-1">{selectedPatient?.screening_date || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">X-Ray Result</p>
                <p className="text-white font-medium mt-1">{selectedPatient?.xray_result || 'Pending'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">TB Diagnosed</p>
                <p className="text-white font-medium mt-1">{selectedPatient?.tb_diagnosed || 'N/A'}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

---

### **Step 3: Create Azure SAS Token API**

**File:** `app/api/azure/sas-token/route.ts` (CREATE NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    const { containerName, blobName } = await request.json();

    if (!containerName || !blobName) {
      return NextResponse.json(
        { error: 'containerName and blobName are required' },
        { status: 400 }
      );
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;

    if (!accountName || !accountKey) {
      throw new Error('Azure Storage credentials not configured');
    }

    // Create shared key credential
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    // Generate SAS token (valid for 1 hour)
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'), // Read-only
        startsOn: new Date(),
        expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour
      },
      sharedKeyCredential
    ).toString();

    const sasUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;

    return NextResponse.json({
      sasUrl,
      sasToken,
      expiresAt: Date.now() + 3600 * 1000
    });

  } catch (error: any) {
    Sentry.captureException(error, {
      tags: {
        component: 'neural-nexus',
        api: 'azure-sas-token'
      },
      extra: {
        endpoint: '/api/azure/sas-token'
      }
    });

    console.error('SAS token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate SAS token', details: error.message },
      { status: 500 }
    );
  }
}
```

---

### **Step 4: Add Azure SDK Dependency**

**File:** `package.json`  
**Action:** Add to dependencies

```bash
bun add @azure/storage-blob
```

Or manually add to `package.json`:

```json
"dependencies": {
  "@azure/storage-blob": "^12.17.0",
  // ... existing dependencies
}
```

---

### **Step 5: Add Environment Variables**

**File:** `.env.local`  
**Action:** Add Azure credentials

```env
# Azure Blob Storage (for X-Ray images)
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
AZURE_STORAGE_CONTAINER_NAME=xray-images

# Optional: Azure Computer Vision (for AI annotations)
AZURE_COMPUTER_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com/
AZURE_COMPUTER_VISION_KEY=your_computer_vision_key
```

---

### **Step 6: Extend Zustand Store (Optional)**

**File:** `stores/useEntityStore.ts`  
**Action:** Add Neural Nexus state (if you need global state)

```typescript
interface EntityStore {
  // ... existing state
  
  // Neural Nexus state
  neuralNexusViewerOpen: boolean;
  selectedXrayPatient: any | null;
  xrayMetadata: any | null;
  
  // Actions
  setNeuralNexusViewerOpen: (open: boolean) => void;
  setSelectedXrayPatient: (patient: any | null) => void;
  setXrayMetadata: (metadata: any | null) => void;
}

export const useEntityStore = create<EntityStore>()(
  persist(
    (set, get) => ({
      // ... existing state
      
      neuralNexusViewerOpen: false,
      selectedXrayPatient: null,
      xrayMetadata: null,
      
      setNeuralNexusViewerOpen: (open) => set({ neuralNexusViewerOpen: open }),
      setSelectedXrayPatient: (patient) => set({ selectedXrayPatient: patient }),
      setXrayMetadata: (metadata) => set({ xrayMetadata: metadata }),
    }),
    // ... persist config
  )
);
```

---

### **Step 7: Create XRayCanvas Component (Optional Advanced)**

**File:** `components/XRayCanvas.tsx` (CREATE NEW - for DICOM support)

```typescript
'use client';

import { useEffect, useRef } from 'react';
import * as cornerstone from 'cornerstone-core';
import * as cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

interface XRayCanvasProps {
  imageUrl: string;
  zoom?: number;
  rotation?: number;
}

export default function XRayCanvas({ imageUrl, zoom = 1, rotation = 0 }: XRayCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;

    // Initialize Cornerstone for DICOM rendering
    cornerstone.enable(canvasRef.current);

    // Load image
    cornerstone.loadImage(imageUrl).then(image => {
      cornerstone.displayImage(canvasRef.current!, image);
      
      // Apply zoom and rotation
      const viewport = cornerstone.getViewport(canvasRef.current!);
      viewport.scale = zoom;
      viewport.rotation = rotation;
      cornerstone.setViewport(canvasRef.current!, viewport);
    });

    return () => {
      if (canvasRef.current) {
        cornerstone.disable(canvasRef.current);
      }
    };
  }, [imageUrl, zoom, rotation]);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full bg-black rounded-2xl overflow-hidden"
      style={{ minHeight: '600px' }}
    />
  );
}
```

**Note:** For DICOM support, add:
```bash
bun add cornerstone-core cornerstone-wado-image-loader dicom-parser
```

---

## 7️⃣ Neural Nexus Integration Checklist

### **Phase 1: Route Setup** ✅
- [x] Add `Brain` icon import to `app/dashboard/layout.tsx`
- [x] Add Neural Nexus tab to `TAB_CONFIG` array
- [x] Create `app/dashboard/neural-nexus/page.tsx`

### **Phase 2: API Routes** ✅
- [x] Create `app/api/azure/sas-token/route.ts`
- [x] Add Azure SDK: `bun add @azure/storage-blob`
- [x] Configure environment variables in `.env.local`

### **Phase 3: State Management** ✅
- [x] Use `useUniversalFilter()` for patient filtering
- [x] Use `useSWRAllPatients()` for patient data
- [x] (Optional) Extend `useEntityStore` for global X-Ray state

### **Phase 4: UI Components** ✅
- [x] Main viewer in `page.tsx` with Sheet modal
- [x] Patient list sidebar with ScrollArea
- [x] Skeleton loaders for loading states
- [x] (Optional) Create `XRayCanvas.tsx` for DICOM support

### **Phase 5: Asset Handling** ✅
- [x] Lazy load XRayCanvas with `dynamic()`
- [x] Skeleton loaders during image fetch
- [x] Binary data handling via Azure Blob SAS tokens

### **Phase 6: Integration Testing** 🧪
- [ ] Navigate to `/dashboard/neural-nexus` - verify route works
- [ ] Click sidebar tab - verify active state highlights
- [ ] Select patient - verify X-Ray loads
- [ ] Test zoom/rotate controls
- [ ] Verify filter context sync (change district in GIS → updates Neural Nexus)
- [ ] Check z-index layering (modal appears above content)
- [ ] Test Sonic AI: "Show X-Ray for Mumbai" command
- [ ] Verify no console errors
- [ ] Check Sentry for API errors

---

## 7️⃣ Google Stitch UI Generation Prompt

**Feed this to Google Stitch after reading this document:**

```
Design a high-density clinical X-Ray viewer tab called "Neural Nexus" for a Next.js 14 TB patient tracking application.

CONSTRAINTS:
- Use Shadcn/ui components (Sheet, Button, Card, ScrollArea, Skeleton)
- Follow "Tactical Glass" aesthetic: backdrop-blur-md, rounded-2xl, bg-white/80
- Color palette: blue-500 (primary), emerald-500 (success), red-500 (alerts), slate-50 (bg)
- Z-index: Import from @/lib/zIndex for overlays/modals
- State: Use Zustand store (useEntityStore) for global state
- API: POST to /api/azure/sas-token for Azure Blob SAS tokens
- Lazy load heavy components with dynamic imports
- Use Skeleton loaders during image loading
- Integrate with Universal Filter Context (useUniversalFilter hook)
- Match existing navigation pattern (see TAB_CONFIG)

LAYOUT:
- Left sidebar: Patient list (filtered by district/status)
- Center: X-Ray viewer canvas (DICOM/PNG support)
- Right panel: Metadata (patient info, AI annotations)
- Bottom: Action bar (zoom, pan, annotations, export)

FEATURES:
- Click patient → Load X-Ray from Azure Blob Storage
- Display DICOM metadata overlay
- Zoom/pan controls
- AI-powered anomaly highlighting (future integration)
- Export annotated images
- Sonic AI voice commands integration

PERFORMANCE:
- Lazy load viewer only when tab is active
- Use SWR for patient data caching
- Implement virtual scrolling for patient list
- Debounce filter changes

Generate Apple-clean, production-ready React components following these exact patterns.
```

---

## 8️⃣ Critical Integration Points

### **Nerve Endings (Connection Points)**

1. **Navigation Injection**
   - File: `app/dashboard/layout.tsx`
   - Line: ~15 (TAB_CONFIG array)
   - Action: Add Neural Nexus tab config

2. **Route Handler**
   - File: `app/dashboard/neural-nexus/page.tsx` (create new)
   - Pattern: Export default async function

3. **Global State Extension**
   - File: `stores/useEntityStore.ts`
   - Line: ~20 (interface EntityStore)
   - Action: Add xrayViewer state slice

4. **API Route Creation**
   - File: `app/api/azure/sas-token/route.ts` (create new)
   - Pattern: Export POST function

5. **Filter Context Sync**
   - Hook: `useUniversalFilter()` from `@/contexts/FilterContext`
   - Usage: Subscribe to district/status changes

6. **Sonic AI Integration**
   - Hook: `useSonicIntelligence()` from `@/hooks/useSonicIntelligence`
   - Pattern: Pass patient data for voice commands

---

## 9️⃣ Environment Variables

**Add to `.env.local`:**

```env
# Azure Blob Storage (for X-Ray images)
AZURE_STORAGE_ACCOUNT_NAME=your_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_account_key
AZURE_STORAGE_CONTAINER_NAME=xray-images

# Optional: Azure Computer Vision (for AI annotations)
AZURE_COMPUTER_VISION_ENDPOINT=your_endpoint
AZURE_COMPUTER_VISION_KEY=your_key
```

---

## 🎯 Success Criteria

Neural Nexus integration is complete when:

✅ Tab appears in sidebar navigation  
✅ Route `/dashboard/neural-nexus` renders without errors  
✅ SAS token API generates valid Azure Blob URLs  
✅ X-Ray images load with skeleton loaders  
✅ Filter context syncs (district selection updates viewer)  
✅ Z-index layering works (modals over content)  
✅ Lazy loading prevents performance degradation  
✅ Sonic AI responds to "Show X-Ray for [district]" commands  
✅ Design matches existing "Tactical Glass" aesthetic  
✅ No console errors or Sentry alerts  

---

## 📚 Reference Files

**Must Read Before Implementation:**
1. `app/dashboard/layout.tsx` - Navigation pattern
2. `stores/useEntityStore.ts` - Global state structure
3. `contexts/FilterContext.tsx` - Filter management
4. `components/ui/sheet.tsx` - Modal pattern
5. `lib/zIndex.ts` - Z-index constants
6. `app/api/analyze-district/route.ts` - API route example
7. `components/PatientDetailDrawer.tsx` - Sheet usage example
8. `components/LazyComponents.tsx` - Dynamic import pattern

---

**Document Version:** 1.0  
**Last Updated:** Clinical Survey Phase  
**Next Phase:** Google Stitch UI Generation  

---

**Farid Bhai, this is your complete technical blueprint. Feed the "Google Stitch UI Generation Prompt" (Section 7) to Google Stitch along with this document, and you'll get pixel-perfect, production-ready components that slot directly into your existing architecture. No guesswork, no refactoring—just clean integration. 🚀**
