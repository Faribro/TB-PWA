# TB-PWA-Clean

A Progressive Web Application for TB patient tracking and management.

## Features

- **Vertex Dashboard**: Neural network visualization of patient data with interactive 3D interface
- **Follow-up Pipeline**: Patient tracking and triage management system
- **M&E Tools**: Monitoring & Evaluation intelligence hub with duplicate detection and data integrity checks
- **GIS Map**: Spatial intelligence mapping for geographic patient distribution
- **Real-time Sync**: Live data synchronization with backend systems

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Data Fetching**: SWR for caching and real-time updates
- **Authentication**: NextAuth.js
- **Database**: Supabase
- **Visualization**: D3.js, Deck.GL, Three.js

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Performance Optimizations

- Conditional rendering for heavy components
- SWR data consolidation to eliminate redundant API calls
- O(n) algorithms for duplicate detection
- Dynamic imports with loading states
- Memoized components and callbacks

## Architecture

The application uses a modular architecture with:
- Page-level data fetching with SWR
- Prop-drilling for data consistency
- Error boundaries for component isolation
- Dynamic imports for code splitting