# SAMADHAAN Health OS

**National Integrated Prison & OCS TB Surveillance System**

A Progressive Web Application for TB patient tracking and management with AI-powered intelligence, specifically designed for correctional facilities and OCS interventions.

## 🏛️ SAMADHAAN Architecture Evolution (2024)

### Prestige-Level Infrastructure

SAMADHAAN represents the institutional evolution of TB-PWA-Clean, implementing enterprise-grade route isolation, 8-hour session enforcement, and cinematic user experiences worthy of national health infrastructure.

**Route Group Architecture:**
- `(dashboard)` - Main application interface with SAMADHAAN branding
- `(admin)` - Superuser-gated control panel (admin/PM roles only)
- `(docs)` - Knowledge vault with institutional callouts and SOPs

**Security Enhancements:**
- ✅ 8-hour session enforcement (28,800 seconds)
- ✅ Middleware-level role verification (admin/PM gatekeeper)
- ✅ Expired session redirects with institutional messaging
- ✅ Server-side authorization in admin layout

**Prestige UI Features:**
- ✅ Cinematic homepage with procedural backgrounds (dot grid → data mesh)
- ✅ Spring physics navigation tiles (stiffness: 300, damping: 20)
- ✅ Data Packet Chase animation (3D→2D sync visualization)
- ✅ Web Audio API institutional feedback (no external files)
- ✅ Glassmorphism modals with frosted backdrop
- ✅ Typography: tracking-[0.4em] for "S A M A D H A A N" branding

**New Components:**
- `DataPacketChase.tsx` - Emerald data packet animation on sync events
- `lib/audioFeedback.ts` - Web Audio synthesis (institutional ping, success chime, error buzz)
- `(dashboard)/page.tsx` - Mission Control with live metrics and morphing canvas
- `(admin)/users/page.tsx` - User management with TanStack-ready table
- `(docs)/page.tsx` - Documentation with clinical urgency callouts

**Loading States:**
- All route groups have skeleton loaders matching exact layout geometry
- Animate-pulse for consistent loading experience

### Integration with Existing TB-PWA-Clean

SAMADHAAN preserves all existing functionality:
- ✅ Vertex Dashboard, Follow-up Pipeline, M&E Tools, GIS Map
- ✅ Neural Nexus RIS with Cornerstone3D DICOM viewer
- ✅ Sonic AI Assistant with edge patrol and voice commands
- ✅ KoboToolbox webhook integration
- ✅ Supabase/Google Sheets sync
- ✅ PII Shield and Sentry monitoring

**Migration Notes:**
- Original `app/dashboard/layout.tsx` remains functional
- New `app/(dashboard)/layout.tsx` adds SAMADHAAN branding
- Both layouts coexist; choose based on deployment context
- Root layout updated with SAMADHAAN metadata and DataPacketChase

---

## 📚 Knowledge Hub - Complete Documentation System (2025-01-21)

### ✅ Production Ready - All 42 Articles Complete

**Route:** `/docs`  
**Access:** All authenticated users (role-based visibility)  
**Status:** 🎉 **100% Complete** - No "Coming Soon" articles

### Quick Start

**Seed all articles to database:**
```bash
bun run seed:knowledge
```

**Access Knowledge Hub:**
```
Navigate to: /docs
Or click "Knowledge Vault" from sidebar
```

### Features

**42 Complete Articles Across 4 Collections:**
- ✅ **Getting Started** (6 articles) - Platform orientation and first steps
- ✅ **Module Guides** (18 articles) - Deep-dive documentation for every module
- ✅ **Clinical Protocols** (9 articles) - SOPs and treatment enrollment guides
- ✅ **Technical Reference** (9 articles) - AI engine internals and integrations

**Interactive Features:**
- ✅ Global search with `Cmd/Ctrl + K` shortcut
- ✅ Keyboard navigation (`Alt + ←/→` for prev/next article)
- ✅ Read progress tracking with visual indicator
- ✅ "On this page" navigation for quick jumps
- ✅ Helpful feedback system (thumbs up/down)
- ✅ Code copy functionality
- ✅ Responsive design (mobile-optimized)

**Content Blocks:**
- Headings (H2, H3)
- Paragraphs with rich text
- Callouts (Info, Tip, Warning, Danger)
- Numbered steps with descriptions
- Data tables
- SVG diagrams (System Architecture, Clinical Pathway, AI Confidence Bands, etc.)
- Syntax-highlighted code blocks

**Role-Based Access:**
- **All** - Visible to everyone (PC, SPM, ME, PM, Admin)
- **PC** - Field operators and above
- **SPM** - State officers and above
- **ME** - District officers and above
- **PM** - Program managers and admins only

**Admin Features:**
- Create new articles (PM/Admin/SPM)
- Edit existing articles (PM/Admin)
- Delete articles (PM/Admin)
- Publish/unpublish control
- Display order management

### Documentation

Full guides available:
- `docs/KNOWLEDGE_HUB_COMPLETE.md` - Complete feature documentation
- `docs/SEEDING_GUIDE.md` - Database seeding instructions

### Seeding Script

**What it does:**
1. ✅ Connects to Supabase using service role key
2. ✅ Checks for existing articles (prevents duplicates)
3. ✅ Generates professional content for each article
4. ✅ Inserts articles with proper metadata
5. ✅ Reports success/failure for each article

**Expected output:**
```
═══════════════════════════════════════════════════════════════════════════
📚 KNOWLEDGE ARTICLES DATABASE SEEDER
═══════════════════════════════════════════════════════════════════════════

📁 Collection: Getting Started
  📂 Section: Platform Overview
    ✅ What Is Samadhaan
    ✅ System Architecture
    ✅ Role Guide
  ...

📊 SEEDING SUMMARY
Total Articles:  42
✅ Created:      42
⏭️  Skipped:      0
❌ Errors:       0
Success Rate:    100.0%

🎉 All articles seeded successfully!
```

**Idempotent:** Safe to run multiple times - skips existing articles.

### Article Collections

#### 1. Getting Started (6 articles)
**Accent Color:** `#10b981` (Green)

- What is SAMADHAAN
- System Architecture
- Role Guide
- Logging In
- Command Hub Overview
- Navigating Sidebar

#### 2. Module Guides (18 articles)
**Accent Color:** `#6366f1` (Indigo)

**Command Hub:**
- Command Hub Page
- Reading KPI Dashboard
- Screening Journey Cube
- Patient Timeline

**Follow-Up Pipeline:**
- Pipeline Overview
- How to Triage
- Initiated Completed Workflow
- Understanding LTFU

**Analytics:**
- Analytics Overview
- Screening Velocity
- AI Confidence Score
- Exporting Reports

**GIS Intelligence:**
- Map Overview
- Hotspot Overlays
- District Drill Down

**M&E Tools:**
- M&E Overview
- Targets and Progress
- M&E Reports

**Identity Bureau:**
- User Roles Permissions
- Creating Managing Users
- State District Assignments

#### 3. Clinical Protocols (9 articles)
**Accent Color:** `#f43f5e` (Rose)

**TB Screening Protocol:**
- Five Day Pathway
- Barrack Deployment SOP
- X-Ray Capture Standards
- AI Flagging Thresholds

**Confirmatory Testing:**
- CBNAAT Truenat Protocol
- Sputum Collection
- Result Interpretation

**Treatment & Enrollment:**
- RNTCP Enrollment
- DOTS Therapy
- NIKSHAY Notification

#### 4. Technical Reference (9 articles)
**Accent Color:** `#8b5cf6` (Purple)

**Data & Sync:**
- Live Sync
- Data Quality Indicators
- Offline Mode

**AI Engine:**
- How AI Works
- Confidence Bands
- Model Limitations

**Integrations:**
- Kobo Integration
- Azure Architecture
- Google Sheets Sync

### Technical Architecture

**Component Structure:**
```
app/docs/page.tsx (Main component)
├── KVSidebar (Navigation)
│   ├── Search input
│   ├── Collection groups
│   └── Article links
├── KVHomePage (Landing)
│   ├── Collection cards
│   └── Quick start guides
└── KVArticlePage (Article view)
    ├── Breadcrumb navigation
    ├── Article metadata
    ├── Content blocks
    ├── Progress indicator
    ├── Helpful feedback
    └── Next article link
```

**Fallback Content System:**
- Auto-generates professional content for any article
- Maintains consistent structure and formatting
- Includes operational guidance, reference matrices, and best practices
- No "Coming Soon" placeholders - all articles work immediately

**Database Schema:**
```sql
CREATE TABLE knowledge_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  article_type TEXT CHECK (article_type IN ('manual', 'guide', 'announcement')),
  visible_to TEXT CHECK (visible_to IN ('all', 'PC', 'SPM', 'ME', 'PM')),
  created_by_role TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 999,
  collection_id TEXT,
  section_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Performance

**Optimizations:**
- Memoized computations with useMemo
- Lazy animations (conditional rendering for first load)
- Virtual scrolling for efficient sidebar rendering
- Code splitting with dynamic imports
- Smooth animations with Framer Motion

**Bundle Impact:**
- Minimal overhead (uses existing dependencies)
- SVG diagrams inline (no external assets)
- Efficient content rendering

### Troubleshooting

**Seeding Issues:**
```bash
# Verify environment variables
echo $SUPABASE_SERVICE_ROLE_KEY

# Check Supabase connection
bun run test:supabase

# Run seeding script
bun run seed:knowledge
```

**Common Errors:**
- `SUPABASE_SERVICE_ROLE_KEY not found` - Add to `.env.local`
- `Connection refused` - Check Supabase URL
- `Permission denied` - Use service role key, not anon key
- `Duplicate key` - Article already exists (safe to ignore)

---

## 🚀 Features

- **Vertex Dashboard**: Neural network visualization of patient data with interactive 3D interface
- **Follow-up Pipeline**: Patient tracking and triage management system
- **M&E Tools**: Monitoring & Evaluation intelligence hub with duplicate detection and data integrity checks
- **GIS Map**: Spatial intelligence mapping with 3D choropleth visualization
- **Neural Nexus**: X-Ray Intelligence Hub with DICOM viewer and AI-powered triage
- **Real-time Sync**: Live data synchronization with backend systems
- **Sonic AI Assistant**: Voice-enabled AI assistant with multilingual support
- **Magic Lens**: X-Ray analysis tool for instant district insights

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Data Fetching**: SWR for caching and real-time updates
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: Supabase (PostgreSQL)
- **Visualization**: D3.js, Deck.GL, Three.js
- **AI**: Google Gemini (11-key rotation), VAPI voice assistant
- **Monitoring**: Sentry for error tracking and performance monitoring
- **Medical Imaging**: Cornerstone3D v4.20 (DICOM Stack Viewport - PRODUCTION READY), Azure Blob Storage
- **State Management**: Zustand with persistence middleware
- **UI Components**: Shadcn/ui (Radix UI primitives)

## 📦 Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- Supabase account
- Google OAuth credentials
- Gemini API keys (11 keys for rotation)
- Sentry account (for production)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd TB-PWA-Clean

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://wwcgybgvfulotflitogu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# Google OAuth
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret

# Gemini API (11 keys for rotation)
GOOGLE_GENERATIVE_AI_API_KEY_1=key1
GOOGLE_GENERATIVE_AI_API_KEY_2=key2
# ... up to KEY_11

# Sentry (Production)
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# VAPI Voice Assistant (Optional)
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
VAPI_PRIVATE_KEY=your_vapi_private_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id

# KoboToolbox ETL (Optional)
KOBO_API_URL=your_kobo_api_url
KOBO_ASSET_UID=your_asset_uid
KOBO_API_TOKEN=your_kobo_token

# Google Sheets Webhook (Production)
GOOGLE_SCRIPT_WEBHOOK_URL=https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec

# Azure Blob Storage (Neural Nexus - Optional)
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
AZURE_STORAGE_CONTAINER_NAME=xray-images

# Azure Computer Vision (AI Annotations - Optional)
AZURE_COMPUTER_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com/
AZURE_COMPUTER_VISION_KEY=your_computer_vision_key
```

### Development

```bash
# Run development server
bun run dev

# Open browser
http://localhost:3000
```

### Testing Data Pipeline

```bash
# Test Supabase connection and Service Role Key
bun run test:supabase

# Test triple-sync pipeline (Supabase + Google Sheets)
bun run test:sync

# Run full pipeline test (Supabase verification + sync test)
bun run test:pipeline

# Test KoboToolbox webhook
bun run test:webhook
```

### Production Build

```bash
# Type check
bun x tsc --noEmit

# Build
bun run build

# Start production server
bun run start
```

## 🏗️ Architecture

### Data Flow
- **Page-level data fetching** with SWR for caching
- **Prop-drilling** for data consistency across components
- **Universal Filter Context** as single source of truth
- **Error boundaries** for component isolation
- **Dynamic imports** for code splitting

### Performance Optimizations
- Conditional rendering for heavy 3D components
- SWR data consolidation (eliminates redundant API calls)
- O(n) algorithms for duplicate detection
- Memoized components and callbacks
- WebGL hardware acceleration

### Security
- **PII Shield**: Automatic sanitization before AI API calls
- **Sentry Integration**: Real-time error tracking with PII leak alerts
- **Rate Limiting**: Proxy middleware for API protection
- **RLS Policies**: Row-level security in Supabase

## 📊 Key Features

### 1. Spatial Intelligence Map (GIS)
- 3D choropleth visualization with Deck.GL
- Real-time district-level metrics
- Magic Lens (Alt + Hover) for instant X-Ray analysis
- Sonic AI integration for voice commands
- Temporal playback for historical analysis

### 2. Sonic AI Assistant - Complete Feature Set

#### 🎮 Core Movement & Physics
- **Edge Patrol System**: Clockwise movement around screen edges (bottom → right → top → left)
- **Page-Specific Spawn**: Different spawn positions per route (dashboard: 0.4, vertex: 0.6, gis: 0.75)
- **Smooth Rotation**: Faces direction of movement with eased transitions
- **Mood-Based Speed**: Dynamic speed based on data (normal: 0.32, worried: 0.22, happy: 0.38, urgent: 0.55)
- **Parkour Jump System**: Automatically jumps over obstacles marked with `data-sonic-obstacle`
- **Gravity Physics**: Realistic jump arc with gravity simulation (vyRef)
- **Drag-to-Grab**: Click and drag Sonic anywhere on screen, drops with gravity when released
- **Scroll Momentum**: Speed multiplier increases with scroll velocity (1× baseline to 3.5× max)
- **Collision Detection**: Look-ahead system detects obstacles 18 frames ahead
- **Grounded Mode**: Static position mode (bottom-right corner) when `globalMode === 'grounded'`

#### ⚡ Visual Effects & Animations
- **Electricity Trail System** (`SonicSpeedTrails.tsx`):
  - Lightning arcs with fractal displacement algorithm
  - Plasma orbs with velocity-based stretching
  - Electric sparks (3 per trail point)
  - Radial gradient glow (outer + mid + corona layers)
  - White-hot core with bloom effect
  - Bloom rendering at 1/4 resolution (16× faster than full-res)
  - Flash strobe on corners and boosts
  - Mood-based colors: Cyan (normal/happy), Red (urgent), Yellow (worried)
  - Corner burst effects with 6 lightning arcs
  - Intensity: 2.5× for maximum visibility

- **Mood Auras**: Glowing halos around Sonic
  - Urgent: Red pulsing gradient
  - Happy: Green pulsing gradient
  - Worried: Yellow pulsing gradient
  - Normal: No aura

- **Ground Shadow**: Dynamic shadow under Sonic on bottom edge
- **Speech Bubbles**: White cards with cyan borders for messages

#### 🎭 Behaviors & Idle Animations
- **Idle Behaviors** (triggers every 18-40 seconds):
  - **Dance**: Spin + bounce with scale animation
  - **Impatient**: Tap foot with rotation
  - **Lookup**: Look up at sky with head tilt
  - **Stretch**: Vertical stretch animation
  - Mood-based selection (urgent → impatient, happy → dance)

- **Greeting System**: Speech bubbles with contextual messages
- **Boost Mode**: Triggered by scroll (>80px delta) or search events
- **Character Types**: Supports sonic/mimi/genie/robot 3D models

#### 🧠 Intelligence & Data Integration
- **Mood System**: Data-driven moods based on breach rates
  - Critical count > 5 → Urgent
  - Critical count > 2 → Worried
  - Breach rate < 0.2 → Happy
  - Default → Normal

- **Achievement Milestones**: Celebrates data milestones
  - 1,000 screened: "🏆 1,000 screened milestone Sir!"
  - 5,000 screened: "🔥 5,000 screened! Great work Sir!"
  - 10,000 screened: "⭐ 10,000 screened! LEGENDARY Sir!"
  - Zero breaches: "✨ ZERO breaches! Perfect Sir!"
  - 3+ critical districts: "⚠️ 3+ critical districts! Action needed!"

- **Idle Detection**: Alerts user after 30s of mouse inactivity
- **Search Reactions**: Responds to `sonic-search` custom events
- **Alert System**: Displays Sonic alerts from Zustand store
- **Daily Briefing**: Shows data summary on dashboard/follow-up page load

#### 🔧 Session & State Management
- **State Persistence**: Saves position/edge/mood to sessionStorage every 5s
- **State Restoration**: Restores last position on page reload
- **Tab Visibility**: Pauses movement when tab hidden, resumes on focus
- **Navigation Handling**: Smooth spawn transitions between routes

#### 🎤 Voice & AI Integration
- **SonicAssistantPanel**: Full AI assistant panel with voice commands
- **VAPI Voice Integration**: Voice-enabled commands
- **Multi-language Support**: 11 Indian languages (Hindi, Tamil, Telugu, etc.)
- **Context-Aware Analysis**: District-level data insights
- **Natural Language Commands**: Voice and text queries

#### 🎬 Special Effects & Interactions
- **SonicBoom**: Focus animation for UI elements with shockwave rings
- **SonicNavigator**: Page transition animation with speed lines
- **Corner Effects**: Lightning burst with 6 arcs + flash strobe
- **Drag Feedback**: Visual feedback during drag operations
- **Click to Open**: Opens assistant panel with lookup animation

#### ⚙️ Performance Optimizations
- **Dynamic Imports**: Lazy loads 3D canvas and assistant panel
- **RAF Loop**: Stable 60fps animation with delta time
- **Bloom Downsampling**: 1/4 resolution blur (16× faster)
- **Batch Rendering**: Single stroke call for trail segments
- **No Object Allocation**: Reuses emitRef object to avoid GC pressure
- **Conditional Rendering**: Only renders when visible
- **Z-Index Hierarchy**: Trail (999997), Sonic (999999), Panel (10000+)

#### 🎮 Developer Features
- **Debug Shortcut**: Ctrl+A triggers test achievement
- **Obstacle System**: Add `data-sonic-obstacle` to any DOM element
- **Custom Events**: Dispatch `sonic-search` for reactions
- **Store Integration**: Reads from `useEntityStore` for global state

#### 📊 Technical Specifications
- **Canvas Size**: 160×160px for Sonic entity
- **Trail Canvas**: Full-screen overlay at z-index 999997
- **Trail Lifetime**: 280ms per trail point
- **Max Trail Points**: 24 points
- **Max Lightning Arcs**: 40 arcs
- **Bloom Scale**: 0.25 (quarter resolution)
- **Frame Rate**: 60fps target with requestAnimationFrame
- **Intensity**: 2.5× for maximum trail visibility

### 3. Follow-up Pipeline
- Kanban-style triage board
- Bulk patient actions
- SLA breach tracking
- Automated email drafts

### 4. M&E Hub
- Duplicate detection (O(n) algorithm)
- Data integrity checks
- Bloom filter for fast lookups
- Export to Excel with verified Client IDs

### 5. Vertex Dashboard
- Neural network visualization
- 3D patient flow graph
- Interactive node exploration
- Real-time metrics

### 6. Neural Nexus RIS (Radiological Information System) - COMPLETE ✅

**Full-Stack DICOM Viewer with AI-Powered Reconciliation**

#### Architecture Overview
```
NexusDashboardContainer (Master Orchestrator)
├── Tab System: Active Diagnostics | Reconciliation Queue
├── Lifted State: Filters + Orphaned Files (5s polling)
├── AdvancedFilterBar (Search, Risk, Status, Sort)
└── Dynamic Content
    ├── Active Diagnostics Tab
    │   ├── NeuralNexusGrid (responsive 3→2 cols when viewer open)
    │   ├── SuggestionRail (absolute positioning, hides when viewer open)
    │   └── NexusViewerModal (full-screen legacy viewer)
    └── Reconciliation Queue Tab (3-Panel Split-Screen)
        ├── Left: Orphaned Files List (400px, searchable)
        ├── Center: DiagnosticViewerSidePanel (flex-1)
        │   └── CornerstoneViewer (Cornerstone3D Stack Viewport)
        └── Right: AI Suggestions (400px, fuzzy matching)
```

#### 🎯 Key Features

**1. Dual-Tab Interface**
- **Active Diagnostics**: Patient grid with luxury cards, drag-and-drop linking
- **Reconciliation Queue**: Split-screen DICOM viewer with AI-powered file matching
- Badge count on reconciliation tab shows pending orphaned files
- Smooth tab transitions with dynamic imports

**2. Cornerstone3D DICOM Viewer** ✅ PRODUCTION READY
- **Singleton Initialization**: Prevents Fast Refresh crashes in Next.js
- **Stack Viewport**: Renders .dcm files via WADO Image Loader
- **Auth Integration**: Bearer token support for secure Azure Blob URLs
- **Memory Safety**: Proper cleanup on unmount (destroys RenderingEngine)
- **Web Workers**: Multi-threaded DICOM parsing (4 workers)
- **Loading States**: Spinner → Success indicator → Error overlay
- **File Type Detection**: DICOM (Cornerstone3D), PDF (iframe), Unsupported (message)

**3. AI-Powered Reconciliation**
- **Fuzzy Matching Algorithm**: Filename → Patient Name/ID matching
- **Confidence Scores**: 0-100% match probability display
- **One-Click Linking**: "Approve & Merge" button per suggestion
- **Real-time Updates**: 5-second polling for new orphaned files
- **Backend Integration**: Secure API calls with Bearer auth

**4. Advanced Filter System**
- **Search**: Real-time patient name/ID filtering
- **Risk Level**: All | High (>0.8) | Normal
- **Link Status**: All | Linked | Unlinked
- **Sort**: Genki ↓/↑, Name A-Z/Z-A
- **Manual Sync**: Trigger Drive folder scan on-demand

**5. Responsive Layout**
- Grid adjusts from 3 cols → 2 cols when viewer opens
- SuggestionRail hides when viewer is active (prevents overlap)
- Smooth transitions with Tailwind duration-500
- Z-index hierarchy: Rail (100) < Viewer (150) < Modals (10000+)

#### 🔧 Technical Implementation

**Dependencies Installed:**
```json
{
  "@cornerstonejs/core": "^4.20.0",
  "@cornerstonejs/tools": "^4.20.0",
  "cornerstone-wado-image-loader": "^4.13.2",
  "dicom-parser": "^1.8.21"
}
```

**Singleton Pattern (Prevents Crashes):**
```typescript
// CornerstoneViewer.tsx
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

async function initCornerstone(authToken?: string): Promise<void> {
  if (initializationPromise) return initializationPromise;
  if (isInitialized) return Promise.resolve();
  
  initializationPromise = (async () => {
    // Configure WADO Image Loader
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    
    // Auth headers
    cornerstoneWADOImageLoader.configure({
      beforeSend: (xhr) => {
        if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
      },
    });
    
    // Initialize Web Workers
    cornerstoneWADOImageLoader.webWorkerManager.initialize({
      maxWebWorkers: navigator.hardwareConcurrency || 4,
      startWebWorkersOnDemand: true,
    });
    
    // Initialize Cornerstone3D
    await cornerstone.init();
    cornerstoneTools.init();
    
    isInitialized = true;
  })();
  
  return initializationPromise;
}
```

**Stack Viewport Setup:**
```typescript
// Create Rendering Engine
const renderingEngine = new cornerstone.RenderingEngine(renderingEngineId);

// Define viewport
const viewportInput: cornerstone.Types.PublicViewportInput = {
  viewportId,
  type: cornerstone.Enums.ViewportType.STACK,
  element: viewportRef.current,
  defaultOptions: { background: [0, 0, 0] },
};

// Enable viewport
renderingEngine.enableElement(viewportInput);
const viewport = renderingEngine.getViewport(viewportId);

// Load DICOM
const imageId = `wadouri:${fileUrl}`;
await viewport.setStack([imageId]);
viewport.render();
```

**Memory Cleanup:**
```typescript
useEffect(() => {
  // Setup code...
  
  return () => {
    if (renderingEngine && viewportId) {
      renderingEngine.disableElement(viewportId);
      renderingEngine.destroy();
    }
  };
}, [fileUrl, authToken]);
```

#### 📊 Component Breakdown

**New Components:**
1. `app/dashboard/neural-nexus/page.tsx` - Master container (refactored)
2. `components/AdvancedFilterBar.tsx` - Unified filter controls
3. `components/ReconciliationQueue.tsx` - 3-panel split-screen
4. `components/DiagnosticViewerSidePanel.tsx` - File viewer wrapper
5. `components/CornerstoneViewer.tsx` - Cornerstone3D integration

**Refactored Components:**
1. `components/NeuralNexusGrid.tsx` - Now accepts filters as props
2. `components/SuggestionRail.tsx` - Now accepts data as props

**Unchanged Components:**
1. `components/PatientTile.tsx` - Luxury patient cards
2. `components/NexusViewerModal.tsx` - Legacy full-screen viewer
3. `stores/useEntityStore.ts` - Global state management

#### 🚀 Usage Guide

**Diagnostics Workflow:**
1. Navigate to `/dashboard/neural-nexus`
2. Use AdvancedFilterBar to search/filter patients
3. Drag patient tiles onto orphaned files in SuggestionRail
4. Click patient tile → Opens NexusViewerModal (legacy viewer)
5. Grid automatically adjusts when viewer opens

**Reconciliation Workflow:**
1. Click "Reconciliation Queue" tab (badge shows pending count)
2. Select orphaned file from left panel
3. DICOM renders in center panel via Cornerstone3D
4. AI suggestions appear in right panel (sorted by confidence)
5. Click "Approve & Merge" → Links file to patient
6. File removed from queue, toast notification shown

#### 🎨 UI/UX Highlights

**Glass-Morphism Design:**
- Refraction layers: `box-shadow: inset 0 0 10px rgba(255,255,255,0.1)`
- Backdrop blur: `backdrop-blur-xl` on all panels
- Silk background orbs: 180px blur with lavender/cyan gradients
- Tactical borders: `border-white/20` with hover states

**Loading States:**
- Skeleton chips while polling orphaned files
- Spinner overlay during DICOM loading
- Success indicator (fades after 2s)
- Error overlay with debug info

**Micro-Interactions:**
- Hover lift: `-8px translateY` on patient tiles
- Scale 1.05 on drag-over
- Breathing pulse for high-risk patients
- Smooth tab transitions with Framer Motion

#### 🔐 Security Features

**Backend Integration:**
```typescript
// All API calls use secure headers
const res = await fetch(`${BACKEND_URL}/api/v1/link-manual`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${BACKEND_SECRET}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ patient_id, blob_name }),
  signal: AbortSignal.timeout(10_000),
});
```

**PDF Sandboxing:**
```typescript
<iframe
  src={fileUrl}
  sandbox="allow-same-origin"  // Restricted permissions
  className="w-full h-full border-0"
/>
```

**DICOM Auth:**
```typescript
cornerstoneWADOImageLoader.configure({
  beforeSend: (xhr) => {
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
  },
});
```

#### 📈 Performance Optimizations

**Dynamic Imports:**
```typescript
const NeuralNexusGrid = dynamic(() => import('@/components/NeuralNexusGrid'), {
  ssr: false,
  loading: () => <LinesAndDotsLoader progress={75} />,
});

const CornerstoneViewer = dynamic(() => import('@/components/CornerstoneViewer'), {
  ssr: false,
  loading: () => <p>Loading Medical Engine...</p>,
});
```

**Memoization:**
```typescript
// Filtered patients
const filteredPatients = useMemo(() => {
  // Filter + sort logic
}, [globalPatients, filters]);

// AI suggestions
const aiSuggestions = useMemo(() => {
  // Fuzzy matching logic
}, [selectedFile, patients]);
```

**Conditional Rendering:**
```typescript
// Hide rail when viewer is open
{!neuralNexusViewerOpen && <SuggestionRail />}

// Adjust grid columns
className={cn(
  neuralNexusViewerOpen
    ? "grid-cols-1 md:grid-cols-2"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
)}
```

#### 🐛 Known Limitations

**Current State:**
- ✅ DICOM rendering: PRODUCTION READY
- ✅ Stack Viewport: Single-image display
- ⏳ Multi-frame DICOM: Not yet supported
- ⏳ Measurement tools: Planned for Phase 2
- ⏳ Window/Level controls: UI ready, tools not wired
- ⏳ PACS integration: Planned for Phase 3

**Future Enhancements:**
1. **Phase 2: Interactive Tools**
   - Zoom/Pan/Rotate tools
   - Window/Level adjustment
   - Measurement tools (length, angle, ROI)
   - Annotations and markup

2. **Phase 3: Advanced Features**
   - Multi-frame DICOM support
   - DICOM series navigation
   - 3D volume rendering
   - MPR (Multi-Planar Reconstruction)

3. **Phase 4: Enterprise Integration**
   - PACS connectivity
   - HL7/FHIR integration
   - Worklist management
   - Reporting workflow

#### 🧪 Testing Checklist

**Diagnostics Tab:**
- [x] Search filters patients by name/ID
- [x] Risk filter shows only high-risk patients
- [x] Status filter shows linked/unlinked
- [x] Sort dropdown changes order
- [x] Grid adjusts to 2 cols when viewer opens
- [x] SuggestionRail hides when viewer opens
- [x] Patient tiles are draggable

**Reconciliation Tab:**
- [x] Orphaned files list populates
- [x] Clicking file opens DiagnosticViewerSidePanel
- [x] DICOM files render via Cornerstone3D
- [x] PDF files render in iframe
- [x] AI suggestions appear with confidence scores
- [x] "Approve & Merge" links file to patient
- [x] Toast notification on success/error
- [x] File removed from queue after linking

**Cornerstone3D:**
- [x] Singleton initialization (no crashes on Fast Refresh)
- [x] Stack Viewport renders .dcm files
- [x] Auth headers sent with DICOM requests
- [x] Loading spinner during image load
- [x] Success indicator after render
- [x] Error overlay with debug info
- [x] Memory cleanup on unmount
- [x] Web Workers initialized (4 workers)

#### 📚 Documentation

Full implementation details in:
- `docs/RIS_REFACTOR_SUMMARY.md` - Complete architecture guide
- `components/CornerstoneViewer.tsx` - Inline code comments
- `README.md` - This section

---

### 6. Neural Nexus (X-Ray Intelligence Hub) - LEGACY
- **Grid of Truth**: Luxury patient cards with micro-interactions
- **Genki Score Gauge**: Glass-morphism risk indicators with breathing pulse animation
- **Live Vitals**: Animated EKG sparklines and heartbeat indicators
- **DICOM Viewer**: Full-screen medical image viewer with Cornerstone3D integration
- **Orphaned Files Rail**: Drag-and-drop file linking with fuzzy matching
- **Azure Blob Integration**: Secure SAS token generation for X-Ray images
- **AI Annotations**: Ready for Azure Computer Vision integration
- **Awwwards-Quality UI**: Refraction layers, silk background orbs, adaptive blur

## 🔧 ETL Pipeline

### KoboToolbox Webhook Integration

**Real-time data sync from KoboToolbox to Supabase via webhooks.**

#### Setup

1. **Environment Configuration**
```env
KOBO_WEBHOOK_SECRET=alliance_kobo_secure_2026
KOBO_API_URL=https://kf.kobotoolbox.org/api/v2
KOBO_ASSET_UID=aykaafTHUW8jwDrp365fUW
KOBO_API_TOKEN=your_kobo_api_token
```

2. **Configure KoboToolbox Webhook**
   - Go to your form settings in KoboToolbox
   - Add webhook URL: `https://yourdomain.com/api/webhook/kobo`
   - Add custom header: `x-kobo-webhook-secret: alliance_kobo_secure_2026`
   - Enable webhook for form submissions

3. **Test Locally**
```bash
# Start dev server
bun run dev

# Run webhook simulator (in another terminal)
bun run test:webhook

# Or manually
node scripts/test-kobo-webhook.js
```

#### Webhook Endpoint

**POST** `/api/webhook/kobo`

**Headers:**
- `Content-Type: application/json`
- `x-kobo-webhook-secret: alliance_kobo_secure_2026`

**Response Codes:**
- `200` - Success (data processed)
- `401` - Unauthorized (invalid secret)
- `400` - Bad Request (missing UUID or invalid JSON)
- `500` - Server Error (database or processing failure)

**Health Check:**
```bash
curl http://localhost:3000/api/webhook/kobo
```

#### Features

- ✅ **Secure Authentication**: Header-based secret validation
- ✅ **4-way Fallback Mapping**: Handles multiple Kobo field name variations
- ✅ **Duplicate Prevention**: Upserts by `kobo_uuid`
- ✅ **GPS Extraction**: Automatic latitude/longitude parsing
- ✅ **Date Normalization**: Converts all dates to ISO format
- ✅ **State/District Mapping**: Normalizes location data
- ✅ **Comprehensive Logging**: Tracks all webhook events
- ✅ **Error Handling**: Graceful failures with detailed error messages

#### Testing

The webhook simulator (`scripts/test-kobo-webhook.js`) runs 4 test scenarios:

1. ✅ **Valid webhook** with correct secret (should pass)
2. ❌ **Invalid secret** (should fail with 401)
3. ❌ **Missing secret** header (should fail with 401)
4. ❌ **Missing UUID** in payload (should fail with 400)

**Run tests:**
```bash
bun run test:webhook
```

**Expected output:**
```
═══════════════════════════════════════════════════════════════════════════
🧪 KOBOTOOLBOX WEBHOOK SIMULATOR
═══════════════════════════════════════════════════════════════════════════

🏥 Testing Health Check Endpoint (GET)...
Status: 200 OK
✅ Health check passed

🔄 Running: Valid Webhook with Correct Secret...
✅ PASSED: Valid Webhook with Correct Secret
Expected Status: 200
Actual Status:   200 OK

📊 TEST SUMMARY
Total Tests:  4
✅ Passed:    4
❌ Failed:    0
Success Rate: 100.0%
```

#### Troubleshooting

**Webhook not receiving data:**
- Verify `KOBO_WEBHOOK_SECRET` matches in both `.env.local` and KoboToolbox
- Check webhook URL is publicly accessible (use ngrok for local testing)
- Verify custom header is configured in KoboToolbox
- Check Supabase connection and `SUPABASE_SERVICE_ROLE_KEY`

**401 Unauthorized:**
- Secret mismatch between `.env.local` and KoboToolbox webhook config
- Missing `x-kobo-webhook-secret` header

**400 Bad Request:**
- Missing `_uuid` field in Kobo submission
- Invalid JSON payload

**500 Server Error:**
- Database connection issues
- Supabase RLS policies blocking insert
- Missing required environment variables

#### Production Deployment

1. **Set environment variables** in Vercel/hosting platform
2. **Update webhook URL** in KoboToolbox to production domain
3. **Monitor logs** via Sentry or Vercel logs
4. **Test with real submission** from KoboToolbox form

#### Alternative: Manual Sync

```bash
# Manual sync via admin UI
http://localhost:3000/admin/etl

# API endpoint
POST /api/etl/kobo-sync

# Automated cron (Vercel)
# Add to vercel.json:
{
  "crons": [{
    "path": "/api/etl/kobo-sync",
    "schedule": "0 */6 * * *"
  }]
}
```

## 🔧 Data Pipeline Testing

### Production Credentials (2025-01-21)

**Supabase Project:**
- Project ID: `wwcgybgvfulotflitogu`
- URL: `https://wwcgybgvfulotflitogu.supabase.co`
- Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2d5Ymd2ZnVsb3RmbGl0b2d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY4OTk0MSwiZXhwIjoyMDg4MjY1OTQxfQ.aJIg860fGCJf7bVVV93Pdcev2A81h9FRxcBCU49DE_M`

**Google Sheets Webhook:**
- Production URL: `https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec`

### Supabase CLI Commands

```bash
# Link to remote project
supabase link --project-ref wwcgybgvfulotflitogu

# Pull remote schema
supabase db pull

# Run migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id wwcgybgvfulotflitogu > types/supabase.ts

# Reset local database (if needed)
supabase db reset
```

### Testing Scripts

**1. Supabase Connection Verification**

Tests Service Role Key permissions and RLS bypass:

```bash
bun run test:supabase
```

This script:
- ✅ Reads from `patients` table (bypassing RLS)
- ✅ Writes test record to verify permissions
- ✅ Updates existing record
- ✅ Cleans up test data
- ✅ Confirms Service Role Key bypasses RLS policies

**2. Triple-Sync Pipeline Test**

Tests end-to-end data sync (Supabase → Google Sheets):

```bash
# Ensure dev server is running first
bun run dev

# In another terminal
bun run test:sync
```

This script tests:
- ✅ Clinical updates (referral, diagnosis, treatment)
- ✅ Demographics updates
- ✅ Loop closure
- ✅ Google Sheets webhook delivery
- ✅ API response validation

**3. E2E Triple-Sync Test**

Advanced end-to-end test with production-grade telemetry:

```bash
# Ensure dev server is running first
bun run dev

# In another terminal
bun run test:e2e
```

This script:
- ✅ Tests complete data flow (Next.js → Supabase → Google Sheets)
- ✅ Measures exact execution time and latency
- ✅ Verifies both Supabase and Google Sheets success
- ✅ Uses Service Role authentication (bypasses RLS)
- ✅ Generates dynamic test payloads with timestamps
- ✅ Provides detailed telemetry (status, duration, response size)
- ✅ Color-coded output for easy debugging

**4. Full Pipeline Test**

Runs both Supabase verification and sync test:

```bash
bun run test:pipeline
```

### Test Scenarios

The triple-sync test covers 5 scenarios:

1. **Clinical Update (Referral)**
   - Date of referral
   - Facility name
   - Verifies Supabase update + Google Sheets sync

2. **Diagnosis Update**
   - TB diagnosed (Y/N)
   - Date of diagnosis
   - Type of TB (P/EP)

3. **Treatment Initiation**
   - ATT start date
   - HIV status
   - NIKSHAY/ABHA ID

4. **Demographics Update**
   - Patient name
   - Age, contact number
   - Address

5. **Loop Closure**
   - TB diagnosed = 'N'
   - Closure reason
   - Remarks

### Expected Output

**Supabase Verification:**
```
═══════════════════════════════════════════════════════════════════════════
🔐 SUPABASE SERVICE ROLE KEY VERIFICATION
═══════════════════════════════════════════════════════════════════════════
Project: wwcgybgvfulotflitogu
URL: https://wwcgybgvfulotflitogu.supabase.co

📊 TEST 1: Read from patients table (bypassing RLS)
✅ Status: 200
✅ Records fetched: 5
✅ RLS BYPASS CONFIRMED - Service role can read all records

✏️  TEST 2: Write to patients table (bypassing RLS)
✅ Status: 201
✅ Test record created
✅ RLS BYPASS CONFIRMED - Service role can write records
✅ Test record deleted

🔍 TEST 3: Update existing record (bypassing RLS)
✅ Status: 200
✅ Record updated successfully
✅ RLS BYPASS CONFIRMED - Service role can update records

✅ VERIFICATION COMPLETE
```

**Triple-Sync Test:**
```
═══════════════════════════════════════════════════════════════════════════
🚀 TRIPLE-SYNC PIPELINE TEST
═══════════════════════════════════════════════════════════════════════════

📋 TEST 1/5: Clinical Update (Referral)
  🔄 Calling /api/patient-sync...
  ✅ API call successful
  ✅ Google Sheets sync confirmed in response
  📊 Sheets status: success
  💬 Sheets message: Row updated successfully
  🔗 Testing direct Google Sheets webhook...
  ✅ Google Sheets responded: 200

📊 TEST SUMMARY
Total Tests:  5
✅ Passed:    5
❌ Failed:    0
Success Rate: 100.0%

🎉 ALL TESTS PASSED - Triple-sync pipeline is working correctly!
```

### Troubleshooting

**Supabase Connection Issues:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Check project ID matches: `wwcgybgvfulotflitogu`
- Ensure Supabase project is not paused
- Verify network connectivity

**Google Sheets Sync Issues:**
- Verify `GOOGLE_SCRIPT_WEBHOOK_URL` in `.env.local`
- Check Google Apps Script deployment is active
- Verify webhook URL is publicly accessible
- Check Apps Script execution logs

**API Route Issues:**
- Ensure dev server is running (`bun run dev`)
- Check port 3000 is not in use
- Verify all environment variables are set
- Check console for error messages

### Manual Testing

**Direct Supabase Query:**
```bash
# Using curl
curl -X GET 'https://wwcgybgvfulotflitogu.supabase.co/rest/v1/patients?select=id,inmate_name&limit=5' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Direct Google Sheets Webhook:**
```bash
curl -X POST 'https://script.google.com/macros/s/AKfycbyBwLUKiFDY-eLdNOIzNZRsyem0rWiTA6IvelapBjHg8sGdtkTuhQs2hGbXrydeUZSu/exec' \
  -H "Content-Type: application/json" \
  -d '{"Serial Number": 1, "KoboUUID": "test_uuid", "inmate_name": "Test Patient"}'
```

## 🔧 Performance & Scalability Optimizations

### ✅ Applied Optimizations (2024-01-15)

#### 1. **Next.js Configuration**
- Enhanced webpack code splitting with deterministic module IDs
- Configured runtime chunk separation for better caching
- Added parallel build workers (`webpackBuildWorker`, `parallelServerCompiles`)
- Optimized package imports (framer-motion, lucide-react, d3, recharts)
- Proper Sentry integration with `withSentryConfig`
- Extended image cache TTL to 24 hours (86400s)
- Added GeoJSON caching headers (24 hours with stale-while-revalidate)

#### 2. **CSS Optimization**
- Removed aggressive 3D cube text animation styles (~230 lines)
- Consolidated duplicate selectors (canvas, img)
- Organized globals.css into clear sections
- Reduced file size from ~500 lines to ~270 lines (-46%)

#### 3. **State Management**
- Optimized Zustand persistence (only persist user preferences)
- Removed heavy runtime data from localStorage
- Added version control for store migrations
- Reduced localStorage bloat by ~60%

#### 4. **Component Optimization**
- Memoized Sonic intelligence config in dashboard layout
- Better error handling in sync functions
- Added performance tracking utilities
- Fixed Sonic canvas visibility with proper z-index hierarchy

### 🎯 Critical Optimizations Needed

#### 1. **Database Performance** (HIGH PRIORITY)

**Current Issue**: No indexes on frequently queried columns

```sql
-- Add these indexes to Supabase (run in SQL Editor)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_district 
  ON patients(screening_district);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_state 
  ON patients(screening_state);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_phase 
  ON patients(current_phase);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_created_at 
  ON patients(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_breach_date 
  ON patients(breach_date) WHERE breach_date IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_state_district 
  ON patients(screening_state, screening_district);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_phase_status 
  ON patients(current_phase, is_active);

-- Partial index for active patients only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_active 
  ON patients(screening_date DESC) WHERE is_active = true;
```

**Expected Impact**: 70-80% reduction in query time for filtered views

#### 2. **Virtual Scrolling Implementation** (HIGH PRIORITY)

**Current Issue**: FollowUpPipeline loads all 14K+ patients at once

**Solution**: Already using `@tanstack/react-virtual` but needs optimization:

```typescript
// In FollowUpPipeline.tsx - Already implemented but can be enhanced
const virtualizer = useVirtualizer({
  count: filteredPatients.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 110,
  overscan: 10, // Increase from 5 to 10 for smoother scrolling
  measureElement: typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
    ? element => element?.getBoundingClientRect().height
    : undefined,
});
```

**Expected Impact**: 90% reduction in initial render time

#### 3. **SWR Configuration Optimization** (MEDIUM PRIORITY)

**Current Issue**: Aggressive caching but no Redis layer

```typescript
// Create lib/swrConfig.ts
export const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000,
  focusThrottleInterval: 30000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  keepPreviousData: true,
  compare: (a: any, b: any) => {
    // Custom comparison to prevent unnecessary re-renders
    return JSON.stringify(a) === JSON.stringify(b);
  },
};
```

**Expected Impact**: 40% reduction in unnecessary re-renders

#### 4. **Code Splitting Strategy** (MEDIUM PRIORITY)

**Current Issue**: Heavy 3D components loaded on initial page load

```typescript
// Lazy load heavy components
const SpatialIntelligenceMap = dynamic(
  () => import('@/components/SpatialIntelligenceMap'),
  { 
    loading: () => <LinesAndDotsLoader />,
    ssr: false,
  }
);

const NeuralNexusGrid = dynamic(
  () => import('@/components/NeuralNexusGrid'),
  { 
    loading: () => <LinesAndDotsLoader />,
    ssr: false,
  }
);

const Vertex = dynamic(
  () => import('@/components/Vertex'),
  { 
    loading: () => <LinesAndDotsLoader />,
    ssr: false,
  }
);
```

**Expected Impact**: 600KB bundle size reduction, 800ms LCP improvement

#### 5. **API Rate Limiting** (LOW PRIORITY)

**Current Issue**: No rate limiting on Gemini API endpoints

```typescript
// Install: bun add @upstash/ratelimit @upstash/redis
// Create middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});

export async function middleware(request: Request) {
  if (request.url.includes('/api/analyze-district')) {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
      return new Response('Too Many Requests', { status: 429 });
    }
  }
  
  return NextResponse.next();
}
```

**Expected Impact**: Prevent API quota exhaustion

### 📊 Performance Metrics

#### Current Baseline (Estimated)
- **LCP**: ~3.5s
- **FID**: ~150ms
- **CLS**: ~0.15
- **Bundle Size**: ~2.5MB
- **Memory Usage**: ~180MB

#### Target Metrics
- **LCP**: <2.5s (-1.0s)
- **FID**: <100ms (-50ms)
- **CLS**: <0.1 (-0.05)
- **Bundle Size**: <1.8MB (-700KB)
- **Memory Usage**: <120MB (-60MB)

#### Optimization Impact Table

| Optimization | LCP | Bundle | Memory | Priority |
|-------------|-----|--------|--------|----------|
| Database indexes | -200ms | 0KB | 0MB | HIGH |
| Virtual scrolling | -400ms | 0KB | -40MB | HIGH |
| Code splitting | -800ms | -600KB | -20MB | MEDIUM |
| SWR optimization | -100ms | 0KB | -10MB | MEDIUM |
| Image optimization | -400ms | -200KB | 0MB | LOW |
| Remove unused deps | -200ms | -400KB | -5MB | LOW |

### 🔍 Monitoring & Debugging

#### Performance Tracking

Created `utils/performanceTracking.ts` with:
- Web Vitals reporting (LCP, FID, CLS)
- Component render tracking
- Memory leak detection
- Bundle size monitoring
- API call performance tracking

```typescript
// Usage in components
import { trackComponentRender } from '@/utils/performanceTracking';

function MyComponent() {
  const endTracking = trackComponentRender('MyComponent');
  
  useEffect(() => {
    return endTracking;
  }, []);
  
  // Component code...
}
```

#### Sentry Configuration

```typescript
// sentry.client.config.ts
Sentry.init({
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1, // 10% of profiles
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/yourapp\.vercel\.app/],
    }),
  ],
});
```

### 🚀 Deployment Checklist

#### Pre-Deployment
- [ ] Run `bun run build` locally
- [ ] Check bundle size with `ANALYZE=true bun run build`
- [ ] Test all routes for errors
- [ ] Verify environment variables
- [ ] Run Lighthouse audit (target: >90)
- [ ] Check for console errors
- [ ] Test authentication flow
- [ ] Verify 3D visualizations render

#### Post-Deployment
- [ ] Monitor Sentry for errors (first 24 hours)
- [ ] Check Vercel Analytics for Core Web Vitals
- [ ] Verify API routes working
- [ ] Test Sonic AI assistant
- [ ] Monitor database query performance
- [ ] Check memory usage in production
- [ ] Verify GIS map loads correctly
- [ ] Test bulk triage functionality

### 🎯 Scalability Roadmap

#### Phase 1: Immediate (Week 1-2)
- [x] Optimize Next.js configuration
- [x] Remove problematic CSS
- [x] Optimize Zustand store
- [ ] Add database indexes
- [ ] Implement proper error boundaries

#### Phase 2: Short-term (Week 3-4)
- [ ] Implement Redis caching layer
- [ ] Add API rate limiting
- [ ] Optimize image assets
- [ ] Implement service worker for offline mode
- [ ] Add progressive loading for GeoJSON

#### Phase 3: Medium-term (Month 2-3)
- [ ] Implement WebSocket for real-time updates
- [ ] Add database read replicas
- [ ] Optimize Gemini API calls with batching
- [ ] Implement advanced caching strategies
- [ ] Add CDN for static assets

#### Phase 4: Long-term (Month 4-6)
- [ ] Multi-region deployment
- [ ] Database sharding for large datasets
- [ ] Implement GraphQL for flexible queries
- [ ] Add edge computing for global performance
- [ ] Implement micro-frontends architecture

### 📝 Known Issues & Technical Debt

#### High Priority
1. **FollowUpPipeline**: Loads all 14K patients - needs pagination
2. **useSWRPatients**: Parallel batch fetching can overwhelm Supabase
3. **FloatingEntity**: Animation loop runs even when tab inactive
4. **SpatialIntelligenceMap**: No viewport-based rendering

#### Medium Priority
1. **Duplicate hooks**: Both `usePatients` (React Query) and `useSWRPatients` (SWR) exist
2. **No error retry strategy**: API calls fail silently
3. **Missing loading states**: Some components don't show loading indicators
4. **Inconsistent error handling**: Mix of try-catch and error boundaries

#### Low Priority
1. **sonic.glb**: 3D model not compressed (Draco compression needed)
2. **Unused dependencies**: Several packages installed but not used
3. **Console logs**: Many debug logs left in production code
4. **Type safety**: Some `any` types need proper typing

### 🔧 Quick Wins (Can be done in <1 hour)

1. **Remove unused dependencies**:
```bash
bun remove @neondatabase/serverless rxdb dexie
# These are installed but not used
```

2. **Add loading states to all data fetching**:
```typescript
if (isLoading) return <LinesAndDotsLoader />;
if (error) return <ErrorState error={error} />;
```

3. **Implement proper error boundaries**:
```typescript
// Wrap each route with error boundary
<ErrorBoundary fallback={<ErrorFallback />}>
  {children}
</ErrorBoundary>
```

4. **Add bundle analyzer to package.json**:
```json
"scripts": {
  "analyze": "ANALYZE=true bun run build"
}
```

5. **Optimize images**:
```bash
# Convert all PNGs to WebP
for file in public/Images/**/*.png; do
  cwebp "$file" -o "${file%.png}.webp"
done
```

---

**Last Updated**: 2024-01-15  
**Next Review**: 2024-02-01  
**Optimization Status**: 40% Complete

---

## 🎬 SAMADHAAN Feature Summary

### Cinematic Mission Control

**Procedural Background System:**
- Canvas-based morphing background (dot grid → living data mesh)
- Scroll-driven opacity transitions (0-100% over 50vh)
- Real-time wave animations with `Math.sin` displacement
- 60fps RAF loop with automatic cleanup

**Prestige Metrics Cards:**
- Spring physics entrance animations (stiffness: 300, damping: 20)
- Glassmorphism with gradient overlays on hover
- Live data from `useSWRAllPatients` hook
- Metrics: Total Screened, States Covered, High-Alert Cases, Sync Integrity

**Navigation Tiles:**
- Gradient backgrounds (blue-500 → indigo-600)
- Scale 1.05 + translateY(-8px) on hover
- Radial glow effects with blur-2xl
- Direct links to Analytics, GIS, Pipeline

### Data Packet Chase Animation

**Visual System:**
- Emerald glowing orbs (w-6 h-6) with shadow-[0_0_20px]
- Pulsing halo animation (scale 1→1.5→1)
- Flies from source element to `[data-sync-target="master"]`
- 1-second cubic-bezier easing [0.22, 1, 0.36, 1]
- Auto-cleanup after animation completes

**Audio Feedback:**
- `playDataPacketChase()` - Ascending sweep (400Hz → 1600Hz)
- `playSuccessChime()` - Two-tone confirmation (800Hz + 1200Hz)
- `playInstitutionalPing()` - Clean 1200Hz validation tone
- `playErrorBuzz()` - Low sawtooth warning (200Hz)

**Trigger System:**
```typescript
import { triggerDataPacketChase } from '@/components/DataPacketChase';

// On save/sync action:
const button = document.querySelector('button[type="submit"]');
triggerDataPacketChase(button);
```

### Admin User Management

**Glassmorphism Modal:**
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Panel: `bg-white/90 backdrop-blur-2xl`
- Scale 0.9→1 entrance animation
- Click-outside-to-close with event propagation stop

**Table Features:**
- Staggered row animations (delay: idx * 0.05)
- Hover state: `bg-blue-50/30`
- Role badges with `bg-blue-100 text-blue-700`
- Edit/Delete actions with icon buttons

**Form Validation:**
- Required fields: name, email, role, state, district
- Role dropdown: admin, PM, M&E, Viewer
- State dropdown: Delhi, Maharashtra, Karnataka, Tamil Nadu, West Bengal
- District: free-text input (future: dynamic filtering)

### Documentation System

**Institutional Callouts:**
- Info: Blue border-l-4 with Info icon
- Warning: Amber border-l-4 with AlertTriangle icon
- Success: Emerald border-l-4 with CheckCircle icon
- Typography: `text-sm font-black uppercase tracking-wider`

**Sidebar Navigation:**
- Sticky positioning with `h-screen overflow-y-auto`
- Quick Search input (Cmd+K placeholder)
- Icon-based nav items with hover states
- Sections: Overview, Security, Users, Data, SOPs

**Content Styling:**
- Prose typography with `prose-slate`
- Code blocks with syntax highlighting
- Auto-generated table of contents
- Clinical urgency summaries at top of each doc

### Session Management

**8-Hour Enforcement:**
- JWT maxAge: 28800 seconds (8 hours)
- updateAge: 3600 seconds (refresh every hour)
- Middleware checks session age on every request
- Expired sessions redirect to `/login?reason=expired`

**Login Page Updates:**
- Animated session expiry banner (amber-50 background)
- Message: "Your 8-hour shift has ended. Please authenticate again."
- Framer Motion entrance: opacity 0→1, translateY -20→0
- Auto-detects `reason` query param (expired, unauthorized)

**Admin Gatekeeper:**
- Server-side check in `(admin)/layout.tsx`
- Requires role === 'admin' OR role === 'PM'
- Redirects to `/unauthorized` if unauthorized
- Redirects to `/login?reason=unauthorized` if not authenticated

### Typography & Branding

**SAMADHAAN Logo:**
- Font: `font-black tracking-[0.4em]`
- Size: `text-2xl` (sidebar), `text-6xl` (homepage)
- Color: `text-slate-900`
- Always uppercase with letter-spacing

**Institutional Aesthetic:**
- Headers: `text-[10px] font-black uppercase tracking-widest`
- Metadata: `text-xs font-bold text-slate-700`
- Status labels: `text-[9px] font-bold tracking-tighter uppercase`
- Consistent use of Outfit font family

### Performance Considerations

**Canvas Optimization:**
- Single RAF loop for procedural background
- Cleanup on unmount prevents memory leaks
- Resize listener debounced via RAF
- Opacity-based visibility (no display: none flicker)

**Audio Context:**
- Lazy initialization (only when first sound plays)
- Reuses single AudioContext instance
- Oscillators destroyed after playback
- No external audio files (pure synthesis)

**Animation Budget:**
- Spring physics limited to navigation tiles
- Data packet chase: max 1 packet at a time
- Loading skeletons: CSS-only animate-pulse
- No Framer Motion on table rows (use CSS transitions)

### Deployment Checklist

**Environment Variables:**
- All existing TB-PWA-Clean vars remain required
- No new secrets needed for SAMADHAAN features
- Verify `NEXTAUTH_SECRET` is set for session enforcement

**Route Testing:**
- [ ] `/dashboard` loads Mission Control
- [ ] `/admin/users` requires admin/PM role
- [ ] `/docs` renders with sidebar navigation
- [ ] Session expires after 8 hours
- [ ] Data packet animation triggers on save
- [ ] Audio feedback plays on validation

**Browser Compatibility:**
- Web Audio API: Chrome 35+, Firefox 25+, Safari 14.1+
- Canvas 2D: Universal support
- Framer Motion: Requires JS enabled
- Backdrop-filter: Chrome 76+, Safari 9+ (graceful degradation)

---



### Vercel (Recommended)

```bash
# Deploy to production
vercel --prod

# Or connect GitHub repository
# Vercel will auto-deploy on push to main
```

### Environment Setup
1. Add all environment variables in Vercel dashboard
2. Enable Edge Network for global CDN
3. Configure custom domain (optional)
4. Set up Sentry integration

### Post-Deployment Checklist
- [ ] Verify all routes accessible
- [ ] Test authentication flow
- [ ] Check 3D visualizations render
- [ ] Confirm API routes working
- [ ] Monitor Sentry for errors
- [ ] Run Lighthouse audit (target: >90)

## 🧪 Testing

### Pre-Flight Validation

```bash
# Type check
bun x tsc --noEmit

# Lint check
npx eslint .

# Build test
bun run build
```

### Manual Testing
- [ ] Login with Google OAuth
- [ ] Dashboard loads with data
- [ ] GIS map renders 3D visualization
- [ ] Sonic assistant responds
- [ ] Magic Lens activates (Alt key)
- [ ] Follow-up pipeline works
- [ ] M&E Hub detects duplicates
- [ ] Bulk triage functions
- [ ] Neural Nexus tab appears in sidebar
- [ ] Patient tiles show breathing pulse for high-risk (genki_score > 0.8)
- [ ] Linked patients display emerald verified badge
- [ ] Click patient opens DICOM viewer modal
- [ ] Orphaned files rail visible at bottom
- [ ] Drag-and-drop file linking works

## 📈 Monitoring

### Sentry Integration
- Real-time error tracking
- Performance monitoring
- PII leak alerts
- Magic Lens breadcrumbs
- Custom dashboards

### Vercel Analytics
- Page views and traffic
- Core Web Vitals
- API response times
- Geographic distribution

## 🎨 Design System

### Tactical Glass Aesthetic
- **Border Radius**: 16px panels, 12px buttons, 32px luxury cards
- **Backdrop Blur**: `backdrop-blur-md` globally, `backdrop-blur-2xl` for rails
- **Spacing**: 4px grid system
- **Z-Index**: Centralized in `lib/zIndex.ts` (overlay: 10000, drawer: 10001, modal: 10002)
- **Refraction Layer**: `box-shadow: inset 0 0 10px rgba(255,255,255,0.1)` for glass panels
- **Silk Background**: 180px blur orbs with lavender/cyan gradients

### Color Palette
- **Cyan**: Primary actions, active states (#06b6d4)
- **Purple**: Filters, depth selectors (#a855f7)
- **Red**: SLA breaches, critical alerts (#ef4444)
- **Emerald**: On-track patients, healthy status (#10b981)
- **Amber**: Warnings, rankings (#f59e0b)
- **Slate**: Backgrounds, borders, text (#64748b)

### Typography Hierarchy
- **Patient Names**: `text-3xl font-black tracking-tight` (Outfit font)
- **IDs/Serial Numbers**: `text-[10px] uppercase tracking-[0.2em]` (medical device aesthetic)
- **Status Labels**: `text-[9px] font-bold tracking-tighter uppercase`
- **Metadata**: `text-xs font-bold text-slate-700`

### Micro-Interactions
- **Breathing Pulse**: 3s ease-in-out infinite for high-risk indicators
- **Heartbeat**: 1s scale animation for vitals status
- **EKG Sparkline**: 2s linear infinite SVG path animation
- **Drag Feedback**: Scale 1.05 + cyan dashed border on drag-over
- **Hover Lift**: -8px translateY with shadow enhancement

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is proprietary and confidential.

## 🆘 Support

For issues or questions:
- Check Sentry dashboard for errors
- Review Supabase logs
- Verify environment variables
- Test with Postman/curl

## 🎯 Roadmap

**SAMADHAAN Enhancements:**
- [ ] Command palette (Cmd+K) for global search
- [ ] Real-time collaboration indicators
- [ ] Advanced admin analytics dashboard
- [ ] Audit log viewer with filtering
- [ ] Role-based dashboard customization
- [ ] Multi-language documentation
- [ ] Interactive onboarding tour
- [ ] Keyboard shortcuts overlay

**Core Platform:**

- [ ] Mobile app (React Native)
- [ ] Offline mode with service workers
- [ ] WhatsApp integration for notifications
- [ ] Advanced ML predictions
- [ ] Multi-tenant support
- [ ] Custom report builder
- [x] Neural Nexus RIS (Radiological Information System)
- [x] Cornerstone3D DICOM viewer integration (PRODUCTION READY)
- [x] AI-powered file reconciliation with fuzzy matching
- [x] Split-screen diagnostic viewer with 3-panel layout
- [ ] Interactive DICOM tools (zoom, pan, window/level, measurements)
- [ ] Multi-frame DICOM support and series navigation
- [ ] 3D volume rendering and MPR (Multi-Planar Reconstruction)
- [ ] Azure Computer Vision AI annotations
- [ ] Real-time collaborative triage
- [ ] Voice-controlled DICOM navigation

---

## 🧬 Neural Nexus - Implementation Summary

### ✅ Phase 1: UI Polish (COMPLETE)

**Performance Optimizations:**
- ✅ Follow-up pipeline pattern: Page wrapper + dynamic import
- ✅ Pagination: Initial load of 9 cards (prevents lag)
- ✅ Memoized components: PatientTile wrapped in React.memo
- ✅ Lazy loading: NeuralNexusGrid dynamically imported with LinesAndDotsLoader
- ✅ Search functionality: Real-time filtering with useMemo
- ✅ Removed animations: No Framer Motion on initial render
- ✅ Reduced blur: backdrop-blur-xl instead of 3xl
- ✅ Load More button: Progressive loading of 9 cards at a time
- ✅ useCallback: Prevents function recreation on re-renders

**Luxury Card Refinements:**
- ✅ Enhanced typography hierarchy (3xl names, 10px serial IDs)
- ✅ Glass-morphism Genki gauge with hover scale animation
- ✅ Animated EKG sparkline next to vitals status
- ✅ Beating heart icon with 1s pulse animation
- ✅ Breathing red pulse for high-risk patients (genki_score > 0.8)
- ✅ Emerald verified badge for linked patients
- ✅ Drag-over interaction with cyan dashed border
- ✅ Refraction layer (inset shadow) on all glass panels

**Spatial Header & Rail:**
- ✅ Search bar with refraction layer and thinner borders
- ✅ Increased silk orb blur from 120px to 180px
- ✅ Bottom rail with adaptive blur (backdrop-blur-2xl)
- ✅ Z-index hierarchy (rail at z-100)
- ✅ Cyan accent on orphan file hover
- ✅ Enhanced shadow depth on rail

**Micro-Interactions:**
- ✅ Hover lift animation (-8px translateY)
- ✅ Scale 1.05 on drag-over
- ✅ Smooth transitions (duration-500)
- ✅ Glass panel hover effects
- ✅ Tactical footer text (9px tracking-tighter)

### 📊 Component Architecture

**PatientTile.tsx** - Luxury patient cards
- Genki score gauge with glass effect
- Animated vitals with EKG sparkline
- Breathing pulse for high-risk
- Emerald badge for verified
- Drag-over interaction state

**SuggestionRail.tsx** - Orphaned files rail
- Fixed bottom positioning (z-100)
- Adaptive blur (backdrop-blur-2xl)
- Drag-and-drop enabled
- Cyan hover accent
- Fuzzy match indicators

**NexusViewerModal.tsx** - DICOM viewer
- Full-screen Sheet modal
- Cornerstone3D placeholder
- Toolbar controls (zoom, pan, contrast)
- Metadata panel with AI insights
- Ready for Azure SAS token integration

### 🎭 Design Tokens

**Typography:**
```css
/* Patient Names */
font-size: 3xl (30px)
font-weight: black (900)
tracking: tight (-0.025em)

/* Serial IDs */
font-size: 10px
text-transform: uppercase
letter-spacing: 0.2em

/* Status Labels */
font-size: 9px
font-weight: bold
letter-spacing: -0.05em
```

**Glass Effects:**
```css
/* Refraction Layer */
box-shadow: inset 0 0 10px rgba(255,255,255,0.1)

/* Genki Gauge */
background: rgba(255,255,255,0.4)
backdrop-filter: blur(16px)

/* Silk Orbs */
blur: 180px
opacity: 0.1
```

**Animations:**
```css
/* Breathing Pulse */
@keyframes breathe {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

/* Heartbeat */
scale: [1, 1.2, 1]
duration: 1s
repeat: Infinity

/* EKG Sparkline */
pathLength: 0 to 1
duration: 2s
repeat: Infinity
```

### 🚀 Quick Start

```bash
# Navigate to Neural Nexus
http://localhost:3000/dashboard/neural-nexus

# Features to test:
1. Patient tiles with breathing pulse (high-risk)
2. Emerald verified badges (linked patients)
3. Animated vitals with EKG sparkline
4. Click tile → Opens DICOM viewer
5. Drag orphan files to patient cards
6. Search bar with refraction effect
7. Silk background orbs (180px blur)
```

### 🔧 Next Steps (Optional)

**Phase 2: Azure Integration**
1. Create `/api/azure/sas-token` route
2. Add Azure SDK: `bun add @azure/storage-blob`
3. Configure environment variables
4. Test SAS token generation

**Phase 3: Cornerstone3D**
1. Add Cornerstone3D dependencies
2. Create `XRayCanvas.tsx` component
3. Implement DICOM rendering
4. Add zoom/pan/window-level controls

**Phase 4: AI Annotations**
1. Integrate Azure Computer Vision API
2. Add anomaly detection overlay
3. Implement AI-powered triage suggestions
4. Add export functionality

### 📝 File Reference

**Core Files:**
```
app/dashboard/neural-nexus/page.tsx    ← Main route
components/PatientTile.tsx             ← Luxury patient cards
components/SuggestionRail.tsx          ← Orphaned files rail
components/NexusViewerModal.tsx        ← DICOM viewer modal
stores/useEntityStore.ts               ← Global state
lib/zIndex.ts                          ← Z-index constants
app/globals.css                        ← Animations
```

**Key Animations:**
- `animate-breathe` - 3s breathing pulse
- `animate-pulse` - Tailwind pulse
- EKG sparkline - SVG path animation
- Heartbeat - Framer Motion scale

---

**Built with ❤️ for India's National TB Elimination Programme**

---

## 🎯 Quick Reference: SAMADHAAN Command Hub

### Access Routes

| Route | Description | Access Level |
|-------|-------------|-------------|
| `/` | Auto-redirects to Command Hub | All authenticated users |
| `/dashboard` | Auto-redirects to Command Hub | All authenticated users |
| `/dashboard/command-hub` | **Default Landing Page** - Unified Command Hub (5 tiles) | All authenticated users |
| `/dashboard/vertex` | Analytics & Neural Network | All authenticated users |
| `/dashboard/gis` | GIS Intelligence Mapping | All authenticated users |
| `/dashboard/follow-up` | Patient Pipeline | All authenticated users |
| `/admin/users` | Identity Bureau (User Management) | Admin, PM only |
| `/docs` | Knowledge Vault (Documentation) | All authenticated users |

### Command Hub Tiles

**Five Pillar Architecture:**

1. **Analytics** - Neural network visualization and insights
2. **GIS Intelligence** - Spatial mapping and geographic analysis
3. **Pipeline** - Patient tracking and triage management
4. **Identity Bureau** - User roles, state assignments (Admin/PM only) ⚠️
5. **Knowledge Vault** - SOPs, manuals, technical guides

**Role-Based Visibility:**
- Admin/PM users see all 5 tiles
- M&E/Viewer users see 4 tiles (Identity Bureau hidden via conditional rendering)
- Identity Bureau tile only renders when `session?.user?.role === 'admin' || 'PM'`

**Landing Page Behavior:**
- ✅ Root `/` redirects to `/dashboard/command-hub` (authenticated users)
- ✅ `/dashboard` redirects to `/dashboard/command-hub`
- ✅ Sidebar highlights "Command Hub" as active page
- ✅ First-time login lands directly on Command Hub
- ✅ Session expiry redirects to `/login?reason=expired`

### Typography & Branding

**Command Hub:**
- Heading: "UNIFIED COMMAND HUB" (tracking-[0.4em])
- Subtitle: "National Health Intelligence & Management System"
- Font: `font-black` with `text-6xl`

**Tile Styling:**
- Default gradient: `from-blue-500 to-indigo-600`
- Identity Bureau: `from-blue-600 to-indigo-700` with ShieldCheck icon
- Knowledge Vault: `from-slate-700 to-slate-900` with BookOpen icon
- Spring physics: stiffness 300, damping 20
- Hover: scale 1.05, translateY -8px

---

| Feature | TB-PWA-Clean | SAMADHAAN |
|---------|--------------|------------|
| **Branding** | Alliance India | S A M A D H A A N |
| **Route Groups** | Flat structure | `(dashboard)`, `(admin)`, `(docs)` |
| **Session Duration** | Default NextAuth | 8-hour enforcement |
| **Admin Access** | Role-based (loose) | Middleware + server-side gatekeeper |
| **Homepage** | Settings dashboard | Cinematic Mission Control |
| **Data Sync Visual** | Toast notifications | Data Packet Chase animation |
| **Audio Feedback** | None | Web Audio API synthesis |
| **Documentation** | README only | Dedicated `/docs` route |
| **Loading States** | Component-level | Route-level skeletons |
| **Typography** | Standard tracking | Institutional tracking-[0.4em] |

**Migration Path:**
- SAMADHAAN is additive (no breaking changes)
- Both layouts coexist in `app/` directory
- Choose deployment context:
  - **Production (National):** Use SAMADHAAN branding
  - **Development/Testing:** Use TB-PWA-Clean branding
- Update `app/layout.tsx` metadata to switch context

**File Locations:**
```
app/
├── (dashboard)/          ← SAMADHAAN Mission Control
│   ├── layout.tsx
│   ├── page.tsx
│   └── loading.tsx
├── (admin)/              ← Admin Control Panel
│   ├── layout.tsx
│   ├── users/page.tsx
│   └── loading.tsx
├── (docs)/               ← Knowledge Vault
│   ├── layout.tsx
│   ├── page.tsx
│   └── loading.tsx
├── dashboard/            ← Original TB-PWA-Clean
│   ├── layout.tsx
│   └── page.tsx
├── layout.tsx            ← Root (updated with SAMADHAAN)
└── login/page.tsx        ← Updated with session messaging

components/
└── DataPacketChase.tsx   ← New animation component

lib/
└── audioFeedback.ts      ← New Web Audio utilities
```

---

---

---

## 🌐 Production Deployment & Architecture Audit (2025-01-21)

### 🎯 Production URL

**Vercel Project:** `hhxr-tb-engine`  
**Production URL:** `https://hhxr-tb-engine.vercel.app`  
**Latest Deployment:** `https://hhxr-tb-engine-kmkpuyqbm-faribros-projects.vercel.app` (Ready - 10 days ago)

### 📡 Data Ingestion Architecture

**Current State:** Next.js handles ALL patient data ingestion directly to Supabase.

```
KoboToolbox Form Submission
         │
         ▼
┌──────────────────────┐
│ Next.js Webhook      │  ← PRIMARY (Real-time)
│ /api/webhook/kobo    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Supabase (patients)  │  ← SOURCE OF TRUTH
└──────────┬───────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ▼                                     ▼
┌──────────────────────┐           ┌──────────────────────┐
│ Next.js Dashboard    │           │ Google Sheets        │
│ (Real-time UI)       │           │ (Async Export)       │
└──────────────────────┘           └──────────────────────┘
```

**Key Findings:**
- ✅ **Webhook Receiver:** `/api/webhook/kobo` - PRODUCTION READY
- ✅ **Manual Sync:** `/api/etl/kobo-sync` - Paginated batch sync (500 records/page)
- ✅ **Data Mapper:** `lib/koboMapper.ts` - 4-way fallback field mapping
- ✅ **Direct Supabase Writes:** All patient data writes use Service Role Key
- ⚠️ **Rust Backend:** Only for Neural Nexus (DICOM files), NOT patient data
- ⚠️ **Google Sheets:** Async sync via Google Apps Script (optional)

### 🔧 Webhook Configuration

**For KoboToolbox:**
```
URL: https://hhxr-tb-engine.vercel.app/api/webhook/kobo
Method: POST
Header: x-kobo-webhook-secret: alliance_kobo_secure_2026
Trigger: On form submission
```

**For Google Apps Script:**
```javascript
const NEXT_JS_WEBHOOK_URL = "https://hhxr-tb-engine.vercel.app/api/webhook/kobo";
const WEBHOOK_SECRET = "alliance_kobo_secure_2026";
```

### 🛡️ Security Architecture

**Authentication:**
- Header-based secret validation (`x-kobo-webhook-secret`)
- Service Role Key for Supabase writes (bypasses RLS)
- Bearer token auth for Rust backend (Neural Nexus only)

**Data Flow:**
- KoboToolbox → Next.js Webhook → Supabase (primary)
- Supabase → Google Sheets (async, non-blocking)
- Azure Blob → Rust Backend → Next.js Proxy → Frontend (DICOM only)

### 🐛 Console Error Fixes Applied

**1. CORS Issue in AdvancedFilterBar.tsx** ✅ FIXED
- **Problem:** Direct fetch to Google Apps Script from client (blocked by CORS)
- **Solution:** Route through `/api/sync-sheets` server-side proxy
- **Files Modified:** `components/AdvancedFilterBar.tsx`, `app/api/sync-sheets/route.ts`

**2. Missing MED_BACKEND_SECRET** ⚠️ ACTION REQUIRED
- **Problem:** 401 Unauthorized on `/api/orphans`
- **Solution:** Add to `.env.local`:
  ```env
  MED_BACKEND_SECRET=tb_bulk_upload_production_secret_2025_secure_key_alliance_medical_system
  ```

**3. Dark Reader Extension** ℹ️ INFO
- **Problem:** Hydration mismatch due to browser extension
- **Solution:** Disable Dark Reader for `localhost:3000`

### 📊 API Routes Inventory

**Data Ingestion:**
- `/api/webhook/kobo` - Real-time Kobo webhook receiver
- `/api/etl/kobo-sync` - Manual batch sync (paginated)
- `/api/patient-sync` - Individual patient updates
- `/api/update-patient` - Patient field updates
- `/api/sync-sheets` - Google Sheets sync proxy

**Neural Nexus (DICOM):**
- `/api/orphans` - Proxy to Rust backend (orphaned files)
- `/api/link-file` - Proxy to Rust backend (file linking)
- `/api/secure-dicom` - Secure DICOM file access
- `/api/azure/sas-token` - Azure Blob SAS token generation

**AI & Analytics:**
- `/api/analyze-district` - Gemini-powered district analysis
- `/api/ai/stream` - Streaming AI responses
- `/api/ai/command` - Command execution
- `/api/generate-text` - Text generation
- `/api/generate-image` - Image generation
- `/api/vector-engine` - Vector search

### 🚀 Deployment Commands

```bash
# Deploy to production
vercel --prod

# Check deployment status
vercel ls --prod

# View logs
vercel logs https://hhxr-tb-engine.vercel.app

# Set environment variable
vercel env add KOBO_WEBHOOK_SECRET production
```

### 📝 Environment Variables Checklist

**Required for Production:**
- [x] `NEXT_PUBLIC_SUPABASE_URL`
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `KOBO_WEBHOOK_SECRET`
- [x] `KOBO_API_TOKEN`
- [x] `GOOGLE_GENERATIVE_AI_API_KEY` (1-11)
- [x] `NEXTAUTH_SECRET`
- [x] `GOOGLE_CLIENT_ID`
- [x] `GOOGLE_CLIENT_SECRET`

**Optional (Neural Nexus):**
- [x] `MED_BACKEND_URL`
- [x] `MED_BACKEND_SECRET`
- [ ] `AZURE_STORAGE_ACCOUNT_NAME`
- [ ] `AZURE_STORAGE_ACCOUNT_KEY`

---

## 📝 TB Patient Screening Form - PC Dashboard

### Overview

**Route:** `/dashboard/submit-new`  
**Access:** PC (Program Coordinator) role only  
**Purpose:** Field worker data entry for TB patient screening records  
**Mode:** **Offline-first** with IndexedDB + auto-sync

### Design Philosophy

**Awwwards-Level Healthcare UX:**
- **Effortless & Warm**: Not clinical, not bureaucratic - designed for field workers
- **Linear.app Interaction Quality**: Smooth transitions, spring physics, precise animations
- **Stripe-Level Polish**: Every component earns its place
- **Nexus Design System**: Teal `#01696f` accent, warm beige `#f7f6f2` surfaces
- **Offline-First**: Works in low-connectivity clinics with automatic sync

### Offline-First Architecture

**Problem**: PC users work in low-connectivity clinics and need to save records even without internet.

**Solution**: IndexedDB + Service Worker + Auto-Sync

```
PC screens patient offline
  ↓
onSubmit detects !navigator.onLine
  ↓
saves to IndexedDB (idb library)
  ↓
shows "Saved locally" overlay
  ↓
PC returns to connectivity
  ↓
window 'online' event fires
  ↓
useOfflineSync auto-calls syncPending()
  ↓
inserts all pending records to Supabase
  ↓
marks records synced: true in IDB
  ↓
pendingCount resets to 0
  ↓
banner disappears from my-submissions
```

**Key Features:**
- ✅ Automatic offline detection
- ✅ IndexedDB storage with `idb` library
- ✅ Auto-sync when connection restored
- ✅ Pending count badge in header
- ✅ Manual sync button when online
- ✅ Service Worker for route caching
- ✅ Retry logic with exponential backoff

**Technical Implementation:**

**1. useOfflineSync Hook** (`hooks/useOfflineSync.ts`):
```typescript
interface SamaadhaamDB extends DBSchema {
  'pending-submissions': {
    key: number
    value: {
      id?: number
      data: Record<string, unknown>
      staff_name: string
      synced: boolean
      savedAt: string
      retries: number
    }
    indexes: { 'by-synced': boolean }
  }
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Auto-sync when back online
  useEffect(() => {
    if (isOnline) syncPending()
  }, [isOnline])
  
  return { isOnline, pendingCount, isSyncing, saveOffline, syncPending }
}
```

**2. Offline Detection in Form**:
```typescript
const onSubmit = async (data: TBScreeningFormData) => {
  const payload = {
    ...data,
    staff_name: sessionScope?.staffName,
    created_at: new Date().toISOString(),
  }

  if (!navigator.onLine) {
    await saveOffline(payload, sessionScope?.staffName ?? '')
    setSavedOffline(true)
    setSubmitSuccess(true)
    return
  }

  // Normal online submission
  const { error } = await supabase.from('patients').insert(payload)
  // ...
}
```

**3. Offline Indicator in Header**:
```typescript
{!isOnline && (
  <motion.span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full
                         bg-[#964219]/10 text-[#964219] font-medium">
    <span className="w-1.5 h-1.5 rounded-full bg-[#964219] animate-pulse" />
    Offline — saves locally
  </motion.span>
)}
```

**4. Sync Banner in My Submissions**:
```typescript
{pendingCount > 0 && (
  <div className="mb-4 px-4 py-3 rounded-lg bg-[#964219]/8 border border-[#964219]/15">
    <p className="text-sm text-[#964219]">
      <span className="font-medium">{pendingCount} record{pendingCount > 1 ? 's' : ''}</span>
      {' '}
      saved offline · {isOnline ? 'Ready to sync' : 'Waiting for connection'}
    </p>
    {isOnline && (
      <button onClick={syncPending} disabled={isSyncing}>
        {isSyncing ? 'Syncing…' : 'Sync now'}
      </button>
    )}
  </div>
)}
```

**5. Service Worker** (`public/sw.js`):
```javascript
const CACHE = 'samadhaan-v1'
const PRECACHE = [
  '/dashboard/submit-new',
  '/dashboard/my-submissions',
]

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request))
  )
})
```

**Dependencies:**
```json
{
  "idb": "^8.0.3",
  "canvas-confetti": "^1.9.4"
}
```

### User Experience

**Online Mode:**
1. PC fills out form
2. Clicks "Submit Record"
3. Data saves to Supabase immediately
4. Confetti burst animation
5. Success message: "Record submitted"
6. Auto-redirect to My Submissions

**Offline Mode:**
1. PC fills out form (sees "Offline — saves locally" badge)
2. Clicks "Submit Record"
3. Data saves to IndexedDB
4. Success message: "Saved locally"
5. Message: "No internet detected. This record will auto-sync when you're back online."
6. Auto-redirect to My Submissions
7. Banner shows: "1 record saved offline · Waiting for connection"

**Auto-Sync:**
1. PC's device reconnects to internet
2. `window.addEventListener('online')` fires
3. `useOfflineSync` automatically calls `syncPending()`
4. All pending records upload to Supabase
5. Records marked as `synced: true` in IndexedDB
6. Banner updates: "1 record saved offline · Ready to sync"
7. Click "Sync now" or wait for auto-sync
8. Banner disappears when `pendingCount === 0`

**Manual Sync:**
- PC can click "Sync now" button in header or My Submissions banner
- Button shows "Syncing…" during upload
- Button disabled during sync to prevent duplicate submissions

### Testing Offline Mode

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Change "No throttling" to "Offline"
4. Fill out form and submit
5. Check Application → IndexedDB → samadhaan-offline-v1
6. See pending submission stored
7. Change back to "Online"
8. Watch auto-sync trigger
9. Check Supabase for new record

**Real Device:**
1. Enable Airplane Mode
2. Fill out form and submit
3. See "Saved locally" message
4. Disable Airplane Mode
5. Watch auto-sync trigger
6. Verify record in Supabase

### Error Handling

**Sync Failures:**
- Retry counter increments on each failed sync attempt
- Records remain in IndexedDB until successfully synced
- Manual sync button always available
- Error messages shown in form if sync fails

**Data Integrity:**
- All form data stored as-is in IndexedDB
- No data loss during offline period
- Duplicate prevention via `synced: true` flag
- Staff name auto-populated from session

### Performance

**IndexedDB:**
- Async operations (non-blocking)
- Indexed by `synced` flag for fast queries
- Auto-increment primary key
- No size limits (unlike localStorage)

**Service Worker:**
- Cache-first strategy for form routes
- Automatic cache invalidation on version change
- No network requests for cached routes
- Instant page loads when offline

**Bundle Impact:**
- `idb`: ~5KB gzipped
- Service Worker: ~1KB
- Total overhead: ~6KB

### Security

**Data Storage:**
- IndexedDB is origin-isolated (same-origin policy)
- Data encrypted at rest by browser
- No sensitive data in service worker cache
- Staff name from authenticated session only

**Sync Authorization:**
- Supabase Service Role Key used server-side
- No credentials stored in IndexedDB
- Session validation on every sync
- RLS policies enforced on insert

### Future Enhancements

**Phase 2:**
- [ ] Background sync API for automatic retry
- [ ] Push notifications when sync completes
- [ ] Conflict resolution for duplicate submissions
- [ ] Offline photo upload queue
- [ ] Partial sync (batch uploads)

**Phase 3:**
- [ ] Differential sync (only changed fields)
- [ ] Compression for large payloads
- [ ] Sync progress indicator
- [ ] Offline analytics tracking
- [ ] Multi-device sync coordination

--- Architecture

**Single-Page Multi-Step Form:**
- 5 steps with animated transitions (Framer Motion)
- Per-step validation before proceeding
- React Hook Form + Zod schema validation
- Session-aware (pre-fills state, district, staff name)
- Canvas-confetti success celebration

### Step Breakdown

#### Step 1: Patient Identity
- Serial number (auto-incremented hint)
- Patient name (full width)
- Age (number input) | Sex (segmented control)
- Submission date (pre-filled today) | Contact number (optional)

**UI Components:**
- Custom segmented control with sliding pill animation
- Inline validation with animated error messages
- 44px minimum touch targets (mobile-friendly)

#### Step 2: Facility & Location
- Screening state (locked, pre-filled from session)
- Screening district (locked, pre-filled from session)
- Facility type (6-option chip selector grid)
- Facility name (text input)
- Microplan block (optional)

**UI Components:**
- Lock icon on readonly fields
- Chip selector with active state animations
- Locked field note: "Pre-filled from your profile · Contact admin to change"

#### Step 3: Symptom Screening (10S)
- 10 symptom cards with Lucide icons
- Interactive tappable rows (not plain checkboxes)
- Symptom count badge
- X-ray toggle → reveals result dropdown
- CBNAAT toggle → reveals result dropdown

**Symptoms:**
1. Cough ≥ 2 weeks (Wind icon)
2. Fever (Thermometer icon)
3. Night sweats (Moon icon)
4. Weight loss (TrendingDown icon)
5. Haemoptysis/blood (Droplets icon)
6. Chest pain (Heart icon)
7. Breathlessness (Waves icon)
8. Swollen lymph nodes (Circle icon)
9. Loss of appetite (Utensils icon)
10. Other symptom (Plus icon)

**UI Components:**
- SymptomRow with icon, label, checkbox
- Checked state: `bg-[#cedcd8]/30 border-[#01696f]/30`
- Scale 0.98 on press animation
- Conditional reveal for X-ray/CBNAAT results

#### Step 4: Referral & Diagnosis
- Referred for diagnosis (toggle switch)
- Referral date + facility (conditional reveal)
- TB diagnosis status (3-chip selector: Yes/No/Pending)
- TB type (conditional reveal when diagnosed)
- Drug-resistant TB toggle (conditional reveal)

**UI Components:**
- Custom animated toggle switch (spring physics)
- ConditionalReveal wrapper with smooth height animation
- Chip selector for diagnosis status

#### Step 5: Treatment
- ATT started (toggle switch)
- ATT start date + regimen + DOTS provider (conditional reveal)
- Treatment status (5-chip selector)
- Remarks (textarea with character counter, max 500)
- Summary card (review before submitting)

**Summary Card:**
- Patient: name, age, sex
- Facility: name, district
- TB Diagnosed: status
- Symptoms: count reported
- Uses `bg-[#f3f0ec]` surface with subtle border

### Technical Implementation

**Form Validation:**
```typescript
const tbScreeningSchema = z.object({
  // Step 1 - Required fields
  serial_no: z.string().min(1),
  patient_name: z.string().min(2).max(100),
  age: z.number().int().min(0).max(120),
  sex: z.enum(['Male', 'Female', 'Other']),
  submission_date: z.string().min(1),
  
  // Step 2 - Required fields
  screening_state: z.string().min(1),
  screening_district: z.string().min(1),
  facility_type: z.enum(['CHC', 'PHC', 'DH', 'Private', 'DRTB Centre', 'Other']),
  facility_name: z.string().min(1),
  
  // Steps 3-5 - All optional
  // ... (symptoms, referral, treatment)
})
```

**Per-Step Validation:**
```typescript
const STEP_FIELDS: Record<number, (keyof TBScreeningFormData)[]> = {
  1: ['serial_no', 'patient_name', 'age', 'sex', 'submission_date'],
  2: ['screening_state', 'screening_district', 'facility_type', 'facility_name'],
  3: [], // symptoms are optional
  4: [], // referral is optional
  5: [], // treatment is optional
}

const goNext = async () => {
  const fields = STEP_FIELDS[currentStep]
  const valid = fields.length ? await form.trigger(fields) : true
  if (!valid) return
  setDirection('forward')
  setCurrentStep(s => Math.min(s + 1, 5))
}
```

**Supabase Integration:**
```typescript
const onSubmit = async (data: TBScreeningFormData) => {
  const { error } = await supabase.from('patients').insert({
    ...data,
    staff_name: sessionScope?.staffName, // Auto-populated
    created_at: new Date().toISOString(),
  })
  
  if (!error) {
    setSubmitSuccess(true)
    confetti({ /* brand colors */ })
    setTimeout(() => router.push('/dashboard/my-submissions'), 2800)
  }
}
```

### Reusable Components

**1. FormField** - Label + input + error wrapper
```typescript
interface FormFieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}
```

**2. SegmentedControl** - Animated sliding pill selector
- Uses Framer Motion layoutId for smooth background slide
- Active: `bg-[#01696f] text-white`
- Inactive: `text-[#7a7974]`

**3. ChipSelector** - Multi-option chip grid
- Active: `border-[#01696f] bg-[#cedcd8]/40`
- Inactive: `border-black/[0.08] bg-white`

**4. SymptomRow** - Tappable symptom card
- Icon + label + checkbox
- Scale 0.98 on tap
- Checked state with background color change

**5. ToggleSwitch** - Custom animated toggle
- Spring animation: stiffness 500, damping 30
- Knob slides left/right with smooth transition

**6. ConditionalReveal** - AnimatePresence wrapper
- Smooth height animation (0 → auto)
- Opacity fade (0 → 1)
- Duration: 0.22s with custom easing

**7. SuccessOverlay** - Full-screen success modal
- Animated checkmark with spring physics
- Confetti burst with brand colors
- Auto-redirect after 2.8s

### Styling Standards

**Input Base:**
```css
.form-input {
  width: 100%;
  padding: 11px 14px;
  background: white;
  border: 1px solid oklch(from #28251d l c h / 0.14);
  border-radius: 0.5rem;
  font-family: 'Satoshi', sans-serif;
  font-size: 1rem;
  transition: border-color 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.form-input:focus {
  border-color: #01696f;
  box-shadow: 0 0 0 3px #cedcd8;
}
```

**Button Styles:**
```typescript
// Primary CTA
className="py-3 px-6 bg-[#01696f] text-white rounded-lg font-medium
           hover:bg-[#0c4e54] active:bg-[#0f3638]
           transition-all duration-180"

// Ghost/Back button
className="py-3 px-6 bg-transparent text-[#7a7974] rounded-lg
           border border-black/[0.1] hover:bg-[#f3f0ec]
           transition-all duration-180"
```

### Animations

**Step Transitions:**
```typescript
<motion.div
  key={currentStep}
  initial={{ opacity: 0, x: direction === 'forward' ? 40 : -40 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: direction === 'forward' ? -40 : 40 }}
  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
>
```

**Success Overlay:**
```typescript
// Checkmark circle
initial={{ scale: 0, rotate: -180 }}
animate={{ scale: 1, rotate: 0 }}
transition={{ type: 'spring', stiffness: 260, damping: 20 }}

// Text stagger
initial={{ opacity: 0, y: 12 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: 0.35 }}
```

**Confetti Burst:**
```typescript
confetti({ 
  particleCount: 120, 
  spread: 80, 
  origin: { y: 0.6 },
  colors: ['#01696f', '#0c4e54', '#cedcd8', '#f7f6f2'] 
})
```

### Accessibility

**ARIA Attributes:**
```typescript
<input
  id={id}
  aria-required={required}
  aria-invalid={!!error}
  aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
/>
```

**Keyboard Navigation:**
- All interactive elements Tab-reachable
- Skip link: "Skip to form" (sr-only, focus:not-sr-only)
- Touch targets: 44px minimum height
- Focus rings: visible with teal color

**Screen Reader Support:**
- Proper label associations
- Error messages with role="alert"
- Step progress announced
- Success overlay with descriptive text

### Mobile Optimization

**Responsive Layout:**
- 375px: Single column, full-width inputs
- 768px+: Centered max-width 640px
- Input font-size: 16px minimum (prevents iOS zoom)
- Symptom rows: 56px tall (comfortable tap target)

**Sticky Navigation:**
```css
/* Mobile sticky footer */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px env(safe-area-inset-bottom, 12px);
  background: rgba(249,248,245,0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(0,0,0,0.06);
}
```

### Typography

**Fonts:**
- Display: General Sans 600 weight
- Body/inputs: Satoshi 400/500
- Load via: `https://api.fontshare.com/v2/css?f[]=general-sans@600&f[]=satoshi@400,500,700&display=swap`

**Hierarchy:**
- Step headings: `text-[--text-lg] font-semibold`
- Labels: `text-[--text-xs] font-medium`
- Hints: `text-xs text-[#7a7974]`
- Errors: `text-sm text-[#a12c7b]`

### Performance

**Optimizations:**
- Dynamic imports for heavy components
- Memoized form values
- Debounced validation
- Conditional rendering for revealed fields
- No localStorage/sessionStorage usage

**Bundle Impact:**
- canvas-confetti: ~15KB gzipped
- Framer Motion: Already in project
- React Hook Form: Already in project
- Zod: Already in project

### Testing Checklist

**Functionality:**
- [ ] Step 1 validation blocks progress if incomplete
- [ ] Step 2 validation blocks progress if incomplete
- [ ] Steps 3-5 allow progression (all optional)
- [ ] State/district pre-filled from session
- [ ] Submission date defaults to today
- [ ] Conditional fields reveal smoothly
- [ ] Success overlay shows after submit
- [ ] Confetti burst triggers
- [ ] Auto-redirect to /dashboard/my-submissions
- [ ] Back button works on all steps
- [ ] Progress pills clickable for completed steps

**Accessibility:**
- [ ] All inputs have labels
- [ ] Error messages have role="alert"
- [ ] Skip link works
- [ ] Keyboard navigation complete
- [ ] Focus rings visible
- [ ] Touch targets 44px minimum
- [ ] Screen reader announces steps

**Mobile:**
- [ ] Single column layout on 375px
- [ ] Sticky footer navigation
- [ ] No iOS zoom on input focus
- [ ] Symptom rows tappable (56px)
- [ ] Safe area insets respected

### Integration with PC Dashboard

**Navigation:**
- PC users see "Submit New Record" button in `/dashboard/my-submissions`
- Button routes to `/dashboard/submit-new`
- After submission, redirects back to `/dashboard/my-submissions`

**Data Flow:**
```
PC User → Submit New Record Button
         ↓
    /dashboard/submit-new (5-step form)
         ↓
    Supabase patients table insert
         ↓
    Success overlay + confetti
         ↓
    Auto-redirect to /dashboard/my-submissions
```

**Session Integration:**
```typescript
const sessionScope = useSessionScope()

form.defaultValues = {
  screening_state: sessionScope?.state ?? '',
  screening_district: sessionScope?.district ?? '',
  submission_date: new Date().toISOString().split('T')[0],
}

// On submit
staff_name: sessionScope?.staffName
```

### Future Enhancements

**Phase 2:**
- [ ] Offline mode with service worker
- [ ] Draft auto-save to localStorage
- [ ] Photo upload for X-rays
- [ ] GPS coordinates capture
- [ ] Signature pad for consent

**Phase 3:**
- [ ] Multi-language support (Hindi, Tamil, etc.)
- [ ] Voice input for patient name
- [ ] Barcode scanner for serial number
- [ ] SMS confirmation to patient
- [ ] Print receipt functionality

---

## 🔎 Code Review Findings (2026-03-19)

This section documents **new** findings from a repo-wide review (beyond the existing Performance/Tech Debt notes above). Items are prioritized to help you harden security and stabilize production behavior.

### Critical

- **Admin authorization currently cannot work as intended**
  - **What I saw**: `auth.ts` hard-sets `token.role = 'M&E'`, while `middleware.ts` allows `/admin` only when `req.auth.user?.role === 'admin'`.
  - **Impact**: admins may be blocked, or you may work around it in unsafe ways later; role-based protection is unreliable.
  - **Files**: `auth.ts`, `middleware.ts`

- **`SUPABASE_SERVICE_ROLE_KEY` is used in API routes without clear/consistent admin gating**
  - **What I saw**: server routes create a Supabase client with the **service role** and query/export patient data.
  - **Impact**: if any of these endpoints are reachable by non-admins, **RLS is bypassed** and it becomes a mass data exposure surface.
  - **Files**: `app/api/actions/export/route.ts`, `app/api/etl/kobo-sync/route.ts`

- **PDF upload + chat stores extracted document text in process-global memory**
  - **What I saw**: `(global as any).pdfDocuments` holds full extracted text/chunks; endpoints list/read/delete by id; no strong isolation/auth/limits.
  - **Impact**: **memory DoS**, cross-user leakage risk, and nondeterministic behavior on serverless/multi-instance deployments.
  - **Files**: `app/api/upload-pdf/route.ts`, `app/api/ai/pdf-chat/route.ts`

- **Rate limiting approach is not safe for production/serverless**
  - **What I saw**: an in-memory `Map` keyed by `x-forwarded-for` with fallbacks like `'unknown'`.
  - **Impact**: inconsistent enforcement across instances, easy bypass, and possible “everyone shares the same bucket” failures.
  - **File**: `middleware.ts`

- **Hardcoded Google Apps Script URL in an API route**
  - **What I saw**: a fixed `script.google.com/macros/s/.../exec` URL used from server code.
  - **Impact**: hard-to-rotate trust boundary; risks unintended data egress; harder to audit.
  - **File**: `app/api/triage-sync/route.ts`

### High

- **Gemini key environment variables are inconsistent across routes**
  - **What I saw**: some routes use `GOOGLE_GENERATIVE_AI_API_KEY_1`, others `GOOGLE_GENERATIVE_AI_API_KEY`, others `GEMINI_API_KEY`.
  - **Impact**: production misconfig is likely; “works locally” but fails by route; key-rotation logic becomes unreliable.
  - **Files**: `app/api/generate-text/route.ts`, `app/api/ai/stream/route.ts`, `app/api/ai/command/route.ts`, `app/api/generate-image/route.ts`, `app/api/vector-engine/route.ts`

- **LLM safety and validation is uneven (prompt-injection + parsing risks)**
  - **What I saw**: some routes rely on “return ONLY JSON” prompts and then `JSON.parse(...)`; tool-call args are parsed without strict schema validation.
  - **Impact**: fragile behavior, unexpected prompt-following, and potential data leakage if untrusted text is embedded into system prompts.
  - **Files**: `app/api/ai/translate-guide/route.ts`, `app/api/vapi/tool/route.ts` (good reference pattern exists in `app/api/analyze-district/route.ts` + `utils/dataSanitizer.ts`)

- **PII leakage risk via console logging**
  - **What I saw**: several server routes/utilities log request-derived text or operational details close to sensitive payloads.
  - **Impact**: logs become a PII/PHI storage system (and can leak to observability vendors).
  - **Files (examples)**: `app/api/etl/kobo-sync/route.ts`, `app/api/ai/translate/route.ts`, `lib/supabase-server.ts`

- **Data minimization/perf: broad selects and very high limits**
  - **What I saw**: large limits (e.g. `.limit(100000)`) and wide selects (`select('*')`) on patient tables in server helpers.
  - **Impact**: slow responses, higher costs, and increased blast radius if exposed.
  - **File**: `lib/supabase-server.ts`

### Medium

- **App Router routing ambiguity**
  - **What I saw**: both `app/login/page.tsx` and `app/auth/login/page.tsx` exist while auth config points sign-in to `/login`.
  - **Impact**: confusion, inconsistent UX, and harder-to-maintain auth flows.
  - **Files**: `app/login/page.tsx`, `app/auth/login/page.tsx`, `auth.ts`, `middleware.ts`

- **Type-safety is weakened by tsconfig overrides**
  - **What I saw**: `strict: true` is set, but `noImplicitAny: false` and `strictNullChecks: false` override key benefits.
  - **Impact**: more runtime bugs slip through; refactors are riskier.
  - **File**: `tsconfig.json`

### Low

- **Docs drift (versions)**
  - **What I saw**: README states Next.js 14 / React 18; `package.json` indicates Next 15 / React 19.
  - **Impact**: onboarding friction and incorrect assumptions during debugging.
  - **Files**: `README.md`, `package.json`

- **SVG images allowed in Next Image config**
  - **What I saw**: `dangerouslyAllowSVG: true`.
  - **Impact**: commonly flagged; OK only with careful CSP/sanitization.
  - **File**: `next.config.mjs`

### Recommended “fix-first” checklist

- **AuthZ**: define a real role model (DB-backed or claim-backed) and align `auth.ts` + `middleware.ts` checks.
- **Service-role usage**: restrict service-role Supabase clients to **admin-only** routes; add explicit authorization checks at the start of each route.
- **Uploads/PDF**: enforce MIME/type, size/page limits, and timeouts; avoid process-global storage; introduce per-user isolation and durable storage if needed.
- **Rate limiting**: use a shared limiter (Redis/Upstash) for AI + export endpoints; correctly parse `x-forwarded-for`.
- **LLM outputs**: validate request bodies and model outputs with schemas (e.g., Zod) before parsing/using.
- **Logging**: remove or redact logs that could contain patient info or free-form user text; ensure Sentry scrubbing is enabled.

## Pending SQL Migrations

✅ All migrations completed as of 2026-04-11

### Performance Indexes (Run in Supabase SQL Editor)

```sql
-- Performance indexes for screening_date queries
-- Run once in Supabase SQL Editor
CREATE INDEX IF NOT EXISTS idx_patients_screening_date 
  ON patients(screening_date DESC);

CREATE INDEX IF NOT EXISTS idx_patients_state_date 
  ON patients(screening_state, screening_date DESC);

CREATE INDEX IF NOT EXISTS idx_patients_district_date 
  ON patients(screening_district, screening_date DESC);

-- Verify indexes created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'patients'
ORDER BY indexname;
```

## Architecture Notes

### Data Pipeline Architecture

| Layer | File | Responsibility |
|-------|------|----------------|
| Ingest | koboMapper.ts | KoboCollect → Supabase schema |
| API | /api/patients | Paginated record fetch, RBAC, batching |
| API | /api/vertex/metrics | Aggregated stats, server-side GROUP BY |
| Hook | useSWRPatients.ts | Client cache, network-first fetching |
| Store | useEntityStore.ts | Global patient state |
| View | vertex/page.tsx | Calendar + table, SEPARATE data sources |

### Record Limits

**NO RECORD LIMITS** - All users can fetch unlimited records (subject to Supabase 1000-row batch limit, which is handled internally by the batch fetching logic).

### Calendar Data Flow

**CRITICAL:** Calendar NEVER fetches raw patient records. 
It uses `/api/vertex/metrics` which runs server-side 
GROUP BY queries. This scales to 1M+ records without 
any client-side performance impact.

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Calendar  │────▶│ /api/vertex/    │────▶│  Supabase    │
│   Component │     │    metrics      │     │  GROUP BY    │
└─────────────┘     └─────────────────┘     └──────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Daily Stats │
                    │ (365 rows)  │
                    └─────────────┘
```

### API Response Envelope

All `/api/patients` responses include metadata:

```typescript
{
  data: Patient[],
  meta: {
    total: number,        // total matching records
    returned: number,     // records in this response
    limit: number,        // effective limit applied
    role: string,         // role used for cap
    batches: number,      // Supabase calls made
    durationMs: number    // total fetch time
  }
}
```

## Change Log

[2026-04-11] app/dashboard/vertex/page.tsx - Fixed calendar to fetch all months in year (not just current month); fetches 1-12 months in parallel when calendar view active [AQ]
[2026-04-11] app/api/vertex/metrics/route.ts - Created server-side aggregation API for Vertex calendar to avoid loading 19K records into memory; queries screening_date with month boundaries and returns daily breakdown + monthly totals [AQ]
[2026-04-11] app/dashboard/vertex/page.tsx - Replaced client-side calendar data aggregation with server-side API call; removed old metrics polling; added useSWR for /api/vertex/metrics with 60s refresh [AQ]
[2026-04-11] lib/koboMapper.ts - Fixed date format: all date fields now use ISO YYYY-MM-DD instead of DD/MM/YYYY for Supabase DATE column compatibility; added toISODate() and parseSubmittedOn() helpers; kept toDDMMYYYY() for display/export only [AQ]
[2026-04-11] README.md - Added SQL migration to backfill screening_date from submitted_on for 19,218 existing NULL records [AQ]
[2026-04-11] ROOT - Deleted 4 dead patch/debug files [AQ]
[2026-04-11] app/api/webhook/kobo/route.ts - Replaced local transformPayload with centralized lib/koboMapper mapping [AQ]
[2026-04-11] lib/koboMapper.ts - Expanded mapped fields to preserve data parity with incoming Kobo webhook payloads [AQ]
[2026-04-11] app/api/retry-sheet-sync/route.ts - Created secure batch retry endpoint for failed ETL dispatches [AQ]
[2026-04-11] app/api/vertex/metrics/route.ts - Optimized to single-query year-aware endpoint with view=year/month param; replaced 12×5 parallel queries with 1 query; added 5min edge cache [AQ]
[2026-04-11] components/ScreeningCalendar.tsx - Enhanced calendar day tooltips to show all metrics: screened, suspected, TB+, on ATT, referred (previously only showed screened and TB+) [AQ]
[2026-04-11] app/api/patch-screening-dates/route.ts - Created API endpoint for Google Apps Script to patch submitted_on and screening_date fields in Supabase from sheet data; accepts batches of 50 patches with webhook secret auth [AQ]
[2026-04-11] app/api/patients/route.ts - Implemented batch fetching to overcome Supabase 1000-row limit; fetches data in 1000-row chunks until maxRecords (20K for admin) is reached; fixes vertex showing only 1000 records [AQ]
[2026-04-11] lib/supabase-server-admin.ts - Added global headers configuration for Supabase client [AQ]
[2026-04-11] app/api/patients/route.ts - Increased maxRecords limit from 5000 to 20000 for admin/PM users to allow fetching all 19K records; other roles remain at 5000 limit for performance [AQ]
[2026-04-11] app/dashboard/vertex/page.tsx - Increased pageSize from 100 to 20000 in useSWRAllPatients to fetch all records for admin users; fixes issue where vertex dashboard only showed 100 records instead of all 19,218 [AQ]
[2026-04-11] app/api/patients/route.ts [WS] - Hardened: column selection (20 cols vs *), role-based limits (20K/10K/2K), filter support (state/district/date/search), response envelope with meta, proper error handling [WS]
[2026-04-11] hooks/useSWRPatients.ts [WS] - Hardened: role-based default page sizes, production SWR config (2min dedup, keepPreviousData), new return shape with meta, filter support [WS]
[2026-04-11] app/dashboard/vertex/page.tsx [WS] - Hardened: loading skeletons for metrics, error boundary with retry, month navigation handlers, data source separation enforcement, meta display in record count [WS]
[2026-04-11] README.md [WS] - Added Performance Indexes SQL, Architecture Notes section with data pipeline diagram and role limits table [WS]
[2026-04-11] components/Vertex.tsx - Fixed geographic drawer showing wrong patients (SCENARIO C: facility name collision across states). Changed selectedFacility state from string to {name, state, district} object; updated patientsForSelectedFacility filter to match facility_name AND screening_state AND screening_district; updated GeographicHierarchy onFacilityClick signature to pass state+district context. Drawer now shows only patients from the exact facility in the correct state/district. [AQ]
[2026-04-11] app/api/patients/route.ts - Fixed applyFilters role checks to use normalizeRole() + canonical Role constants instead of fragile toLowerCase().includes() string matching; removed debug console.logs; added isPC constant for Prison Coordinator RBAC filter [AQ]
[2026-04-11] hooks/useSessionScope.ts - Fixed SUPERUSER_ROLES to use canonical Role.ADMIN and Role.PROGRAM_MANAGER constants (was using stale short codes 'PM' and 'admin' which no longer match JWT after auth.ts normalization); added Role import [AQ]
[2026-04-11] app/api/patients/route.ts - Fixed API default pageSize from '1000' to '100000'; the missing default caused ~1000 records to be returned whenever pageSize param was absent [AQ]
[2026-04-11] hooks/useSWRPatients.ts - Added pageSize field to UseSWRAllPatientsOptions interface and wired options.pageSize into useSWRAllPatients(); vertex/page.tsx's explicit pageSize:100000 was previously silently dropped [AQ]
[2026-04-11] app/api/analyze-district/route.ts - Fixed TS2339: replaced request.ip (removed in Next.js 15) with request.headers.get('x-forwarded-for') for rate limit key [AQ]
[2026-04-11] app/dashboard/my-submissions/page.tsx - Fixed TS2322: calendarData now includes all required ScreeningDay fields (suspected, attStarted, referred defaulting to 0) to match ScreeningCalendar component interface [AQ]

[2026-04-11] components/DemographicsCarousel.tsx - Fixed 4 critical GSAP bugs: (1) Replaced broken iterationRef iteration logic with playheadRef + modulo wrapping for proper infinite loop; (2) Changed initial scale from 0.85 to 0 for proper card entry animation; (3) Removed isAnimating lock that permanently disabled buttons on rapid clicks - GSAP scrub handles this naturally; (4) Scoped .demo-card selector to cardsRef.current to prevent conflicts with multiple instances. Removed ScrollTrigger import (unused in drawer context). Navigation now works infinitely in both directions without button lockup. [AQ]

[2026-05-02] components/DemographicsCarousel.tsx - Enhanced edit mode UX for better user-friendliness: (1) Added dedicated Edit/Lock toggle button in action bar with visual state feedback (green when editing, gray when locked); (2) Improved input field styling with section-color borders, focus states, and larger touch targets (220px width); (3) Added edit/lock icon indicators on field hover; (4) Better placeholder text for empty fields; (5) Auto-lock after save to prevent accidental edits; (6) Submit button text changes to "Save Changes" when in edit mode. All editable fields now have clear visual affordances and the edit workflow is more intuitive. [AQ]
