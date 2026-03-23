'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GitCommit, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useCommitStore } from '@/stores/useCommitStore';
import { toast } from 'sonner';

interface CommitDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommitDiffModal = ({ isOpen, onClose }: CommitDiffModalProps) => {
  const pendingChanges = useCommitStore((state) => state.pendingChanges);
  const commitAll = useCommitStore((state) => state.commitAll);
  const isCommitting = useCommitStore((state) => state.isCommitting);
  const [localCommitting, setLocalCommitting] = useState(false);

  const handleCommit = async () => {
    setLocalCommitting(true);
    try {
      await commitAll();
      toast.success(`Successfully committed ${pendingChanges.length} changes`, {
        icon: <CheckCircle2 className="w-4 h-4" />,
      });
      onClose();
    } catch (error) {
      toast.error('Failed to commit changes', {
        description: error instanceof Error ? error.message : 'Unknown error',
        icon: <AlertCircle className="w-4 h-4" />,
      });
    } finally {
      setLocalCommitting(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatFieldName = (field: string): string => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[95000]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[85vh] z-[95001]"
          >
            <div className="mx-4 bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-8 py-6 border-b border-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                    <GitCommit className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Review Changes</h2>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {pendingChanges.length} pending change{pendingChanges.length !== 1 ? 's' : ''} ready to sync
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Changes List */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
                {pendingChanges.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No pending changes
                  </div>
                ) : (
                  pendingChanges.map((change, index) => (
                    <motion.div
                      key={change.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 hover:border-slate-700 transition-colors"
                    >
                      {/* Entity Info */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="px-3 py-1 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                            {change.entityType}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">ID: {change.entityId}</span>
                      </div>

                      {/* Field Name */}
                      <div className="mb-3">
                        <span className="text-sm font-bold text-slate-300">
                          {formatFieldName(change.field)}
                        </span>
                      </div>

                      {/* Diff View */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Old Value */}
                        <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4">
                          <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                            Old Value
                          </div>
                          <div className="text-sm text-red-300 line-through opacity-70">
                            {formatValue(change.oldValue)}
                          </div>
                        </div>

                        {/* New Value */}
                        <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4">
                          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                            New Value
                          </div>
                          <div className="text-sm text-emerald-300 font-bold">
                            {formatValue(change.newValue)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-6 border-t border-slate-800/50 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Changes will be synced to Supabase</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    disabled={localCommitting || isCommitting}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: localCommitting || isCommitting ? 1 : 1.02 }}
                    whileTap={{ scale: localCommitting || isCommitting ? 1 : 0.98 }}
                    onClick={handleCommit}
                    disabled={localCommitting || isCommitting || pendingChanges.length === 0}
                    className="relative px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 overflow-hidden"
                  >
                    {/* Animated glow */}
                    {!localCommitting && !isCommitting && (
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      />
                    )}
                    
                    {localCommitting || isCommitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Committing...
                      </>
                    ) : (
                      <>
                        <GitCommit className="w-4 h-4" />
                        Confirm Sync to Supabase
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
