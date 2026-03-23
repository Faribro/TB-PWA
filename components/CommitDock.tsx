'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCommit, X, AlertCircle } from 'lucide-react';
import { useCommitStore } from '@/stores/useCommitStore';
import { CommitDiffModal } from './CommitDiffModal';

export const CommitDock = () => {
  const pendingChanges = useCommitStore((state) => state.pendingChanges);
  const discardAll = useCommitStore((state) => state.discardAll);
  const [showDiffModal, setShowDiffModal] = useState(false);

  const hasPendingChanges = pendingChanges.length > 0;

  return (
    <>
      <AnimatePresence>
        {hasPendingChanges && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90000]"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
              
              {/* Main dock */}
              <div className="relative bg-slate-950/90 backdrop-blur-2xl border border-slate-700/50 rounded-full shadow-2xl shadow-blue-500/20 px-6 py-4 flex items-center gap-6">
                {/* Left: Status indicator */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-3 h-3 bg-blue-500 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-blue-500 rounded-full"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-bold text-white">
                      {pendingChanges.length} Pending Change{pendingChanges.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-slate-700/50" />

                {/* Right: Action buttons */}
                <div className="flex items-center gap-3">
                  {/* Review & Commit Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDiffModal(true)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-full transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                  >
                    <GitCommit className="w-4 h-4" />
                    Review & Commit
                  </motion.button>

                  {/* Discard Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={discardAll}
                    className="px-4 py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 text-sm font-bold rounded-full transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Discard
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diff Modal */}
      <CommitDiffModal
        isOpen={showDiffModal}
        onClose={() => setShowDiffModal(false)}
      />
    </>
  );
};
