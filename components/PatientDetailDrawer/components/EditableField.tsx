'use client';

import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

interface EditableFieldProps {
  label: string;
  value: any;
  onChange: (val: string) => void;
  type?: string;
}

// Helper function to format date values for HTML date inputs
const formatDateValue = (value: any, type: string): string => {
  if (type === 'date' && value) {
    // Extract only YYYY-MM-DD from ISO datetime strings
    if (typeof value === 'string') {
      // Handle ISO 8601 format: "2026-05-01T02:01:41+00:00"
      const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return match[1];
      }
    }
  }
  return value || '';
};

export function EditableField({ label, value, onChange, type = 'text' }: EditableFieldProps) {
  const formattedValue = formatDateValue(value, type);
  
  return (
    <div>
      <label className="block text-xs font-medium text-white/90 mb-1">{label}</label>
      <div className="relative group">
        <Input
          type={type}
          value={formattedValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 text-sm font-medium text-white bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 focus:border-white/40 focus:ring-4 focus:ring-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] rounded-xl transition-all duration-300"
        />
        {/* Shimmer effect on focus */}
        <motion.div
          className="absolute inset-0 -translate-x-full pointer-events-none rounded-xl overflow-hidden"
          animate={{ translateX: ['-100%', '100%'] }}
          transition={{
            duration: 1.5,
            ease: 'easeInOut',
            repeat: 0,
          }}
          style={{ display: 'none' }}
        >
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </motion.div>
      </div>
    </div>
  );
}
