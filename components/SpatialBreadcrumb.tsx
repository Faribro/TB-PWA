'use client';

import { motion } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { useTreeFilter } from '@/contexts/TreeFilterContext';

const ACTION_LABELS = {
  sputum: 'Sputum & Referral',
  diagnosis: 'Diagnosis Update',
  treatment: 'Treatment Update',
  admin: 'Administration'
};

export function SpatialBreadcrumb() {
  const { filter, clearFilter } = useTreeFilter();

  if (!filter.year && !filter.month && !filter.date && !filter.actionType) {
    return null;
  }

  const breadcrumbs = [];
  if (filter.year) breadcrumbs.push(filter.year.toString());
  if (filter.month !== undefined) {
    breadcrumbs.push(new Date(filter.year!, filter.month).toLocaleString('default', { month: 'long' }));
  }
  if (filter.district) breadcrumbs.push(filter.district);
  if (filter.date) {
    breadcrumbs.push(new Date(filter.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }));
  }
  if (filter.actionType) {
    breadcrumbs.push(ACTION_LABELS[filter.actionType]);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 px-4 py-2.5 backdrop-blur-xl bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-2xl shadow-lg shadow-cyan-500/10"
    >
      <div className="flex items-center gap-2 text-sm font-bold">
        {breadcrumbs.map((crumb, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-cyan-500" />}
            <span className="text-cyan-700">{crumb}</span>
          </div>
        ))}
      </div>

      <button
        onClick={clearFilter}
        className="ml-2 w-6 h-6 rounded-xl bg-cyan-200 hover:bg-cyan-300 flex items-center justify-center transition-all duration-300 hover:rotate-90"
      >
        <X className="w-3.5 h-3.5 text-cyan-700" />
      </button>
    </motion.div>
  );
}
