'use client';

import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

interface EditableFieldProps {
  label: string;
  value: any;
  onChange: (val: string) => void;
  type?: string;
}

export function EditableField({ label, value, onChange, type = 'text' }: EditableFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <div className="relative group">
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 text-sm font-medium bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/60 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] rounded-xl transition-all duration-300"
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
          <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-500/10 to-transparent" />
        </motion.div>
      </div>
    </div>
  );
}
