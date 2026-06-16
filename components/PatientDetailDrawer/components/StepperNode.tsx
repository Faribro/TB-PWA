'use client';

import { motion } from 'framer-motion';

interface StepperNodeProps {
  isCurrent: boolean;
  isCompleted: boolean;
  label: string;
}

export function StepperNode({ isCurrent, isCompleted, label }: StepperNodeProps) {
  return (
    <div className="flex flex-col items-center flex-1">
      <div className="relative flex items-center justify-center w-5 h-5">
        {isCurrent && (
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <motion.div
          animate={{
            scale: isCurrent ? [1, 1.1, 1] : 1,
          }}
          transition={{
            duration: 1.5,
            repeat: isCurrent ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className={`relative z-10 w-3 h-3 rounded-full transition-colors duration-300 ${
            isCompleted ? 'bg-emerald-500' : isCurrent ? 'bg-blue-600' : 'bg-slate-200'
          }`}
        />
      </div>
      <span
        className={`text-[10px] mt-1 transition-colors duration-300 ${
          isCurrent
            ? 'text-blue-700 font-bold'
            : isCompleted
            ? 'text-emerald-700 font-semibold'
            : 'text-slate-400 font-medium'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
