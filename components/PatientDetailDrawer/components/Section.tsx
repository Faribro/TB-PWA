'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface SectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  isCurrent?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  isRelevant?: boolean;
}

export function Section({
  id,
  title,
  icon: Icon,
  children,
  isCurrent = false,
  isExpanded,
  onToggle,
  isRelevant = true,
}: SectionProps) {
  return (
    <motion.div
      animate={{
        opacity: isRelevant ? 1 : 0.4,
        scale: isRelevant ? 1 : 0.98,
      }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 30,
      }}
      className={`overflow-hidden rounded-xl border shadow-sm transition-all duration-300 ${
        isCurrent
          ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-200'
          : 'border-slate-100 hover:border-blue-300'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-4 py-4 flex items-center justify-between transition-all duration-200 ${
          isCurrent ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 bg-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${isCurrent ? 'text-blue-600' : 'text-slate-500'}`} />
          <span className="font-semibold text-slate-900 text-sm">{title}</span>
          {isCurrent && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="ml-2 px-2.5 py-0.5 bg-blue-100 text-blue-700 font-bold text-xs rounded-full flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Active Phase
            </motion.span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 bg-white">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
