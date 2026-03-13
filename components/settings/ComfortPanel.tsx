'use client';

import { motion } from 'framer-motion';

interface ComfortPanelProps {
  enhancedReadability: boolean;
  compactView: boolean;
  onReadabilityChange: (value: boolean) => void;
  onCompactViewChange: (value: boolean) => void;
}

export default function ComfortPanel({
  enhancedReadability,
  compactView,
  onReadabilityChange,
  onCompactViewChange,
}: ComfortPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white border border-slate-200/60 shadow-lg rounded-2xl p-8"
    >
      <h3 className="text-lg font-bold text-slate-900 mb-6">Visual Comfort</h3>
      
      <div className="space-y-4">
        <ToggleButton
          label="Enhanced Readability"
          description="Larger text and better contrast"
          enabled={enhancedReadability}
          onChange={onReadabilityChange}
          ariaLabel="Toggle enhanced readability"
        />

        <ToggleButton
          label="Compact View"
          description="Better for tablets and smaller screens"
          enabled={compactView}
          onChange={onCompactViewChange}
          ariaLabel="Toggle compact view"
        />
      </div>
    </motion.div>
  );
}

interface ToggleButtonProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  ariaLabel: string;
}

function ToggleButton({ label, description, enabled, onChange, ariaLabel }: ToggleButtonProps) {
  return (
    <motion.button
      onClick={() => onChange(!enabled)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      className={`w-full flex items-center justify-between p-6 rounded-2xl border-2 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
        enabled
          ? 'bg-blue-50 border-blue-300 shadow-md'
          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="text-left">
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-600 mt-1">{description}</p>
      </div>
      <div className={`relative w-14 h-8 rounded-full transition-colors ${
        enabled ? 'bg-blue-500' : 'bg-slate-300'
      }`}>
        <motion.div
          layout
          className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
          animate={{ x: enabled ? 24 : 0 }}
          transition={{ type: 'spring', bounce: 0.4, duration: 0.3 }}
        />
      </div>
    </motion.button>
  );
}
