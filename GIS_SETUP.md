# 3D GIS Visualization Engine - Setup Instructions

## Task 1: Installation

Run the following command to install all required dependencies:

```bash
npm install @deck.gl/react @deck.gl/layers @deck.gl/aggregation-layers react-map-gl mapbox-gl
```

Or with yarn:

```bash
yarn add @deck.gl/react @deck.gl/layers @deck.gl/aggregation-layers react-map-gl mapbox-gl
```

## Dependencies Breakdown

- **@deck.gl/react**: React wrapper for Deck.gl WebGL rendering engine
- **@deck.gl/layers**: Core layer types (ScatterplotLayer, LineLayer, etc.)
- **@deck.gl/aggregation-layers**: HexagonLayer, GridLayer for data aggregation
- **react-map-gl**: React component for Mapbox GL integration
- **mapbox-gl**: Underlying mapping library

## Environment Variables

Add to your `.env.local`:

```
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

Get a free token at: https://account.mapbox.com/auth/signup/

## Performance Optimization Notes

- Deck.gl uses WebGL for GPU-accelerated rendering
- Can handle 14,000+ points with 60fps on modern hardware
- HexagonLayer automatically aggregates nearby points
- Elevation scale and color encoding are computed on GPU
