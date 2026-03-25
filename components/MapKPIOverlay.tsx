'use client';

import { motion } from 'framer-motion';

type ActiveMetric = 'screened' | 'diagnosed' | 'initiated' | 'completed' | 'breaches';

interface MapKPIOverlayProps {
  activeMetric: ActiveMetric;
  onMetricChange: (metric: ActiveMetric) => void;
}

export function MapKPIOverlay({ activeMetric, onMetricChange }: MapKPIOverlayProps) {
  return null;
}
