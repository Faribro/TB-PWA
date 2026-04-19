"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandCenterFilters {
  dateFrom?: string;
  dateTo?: string;
  state?: string;
  district?: string;
  facilityType?: string;
  suspected?: string;
  tbDiagnosed?: string;
  treatmentStatus?: string;
}

export const DEFAULT_COMMAND_FILTERS: CommandCenterFilters = {
  dateFrom: "",
  dateTo: "",
  state: "",
  district: "",
  facilityType: "",
  suspected: "all",
  tbDiagnosed: "all",
  treatmentStatus: "all",
};

interface CommandFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: CommandCenterFilters;
  onApply: (filters: CommandCenterFilters) => void;
}

export default function CommandFilterDrawer({
  isOpen,
  onClose,
  activeFilters,
  onApply,
}: CommandFilterDrawerProps) {
  // Staged local filters
  const [stagedFilters, setStagedFilters] = useState<CommandCenterFilters>(activeFilters);

  // Sync when reopened
  useEffect(() => {
    if (isOpen) {
      setStagedFilters(activeFilters);
    }
  }, [isOpen, activeFilters]);

  const handleApply = () => {
    onApply(stagedFilters);
    onClose();
  };

  const handleClear = () => {
    setStagedFilters(DEFAULT_COMMAND_FILTERS);
    onApply(DEFAULT_COMMAND_FILTERS);
    onClose();
  };

  const updateFilter = (key: keyof CommandCenterFilters, value: string) => {
    setStagedFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Count active modifications ignoring defaults
  const activeCount = Object.keys(activeFilters).filter((k) => {
    const key = k as keyof CommandCenterFilters;
    return activeFilters[key] && activeFilters[key] !== "all";
  }).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-white/95 backdrop-blur-xl border-l border-white/60 shadow-2xl overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-5 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Filter className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Global Filters</h3>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                      {activeCount > 0 ? `${activeCount} Active` : "No active filters"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 px-6 py-6 space-y-8">
                {/* Date Bounds */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Date Registration Window
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</label>
                      <input
                        type="date"
                        value={stagedFilters.dateFrom || ""}
                        onChange={(e) => updateFilter("dateFrom", e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To</label>
                      <input
                        type="date"
                        value={stagedFilters.dateTo || ""}
                        onChange={(e) => updateFilter("dateTo", e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Geography Map */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900">Geography & Facility</h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">State</label>
                      <select
                        value={stagedFilters.state || ""}
                        onChange={(e) => updateFilter("state", e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white transition-all"
                      >
                        <option value="">All States</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Gujarat">Gujarat</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">District</label>
                      <select
                        value={stagedFilters.district || ""}
                        onChange={(e) => updateFilter("district", e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white transition-all"
                      >
                        <option value="">All Districts</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Dewas">Dewas</option>
                        <option value="Jaipur">Jaipur</option>
                        <option value="Lucknow">Lucknow</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Facility Type</label>
                      <select
                        value={stagedFilters.facilityType || ""}
                        onChange={(e) => updateFilter("facilityType", e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white transition-all"
                      >
                        <option value="">All Facilities</option>
                        <option value="CHC">CHC</option>
                        <option value="PHC">PHC</option>
                        <option value="DH">DH</option>
                        <option value="Private">Private</option>
                        <option value="Prison">Prison</option>
                        <option value="DRTB Centre">DRTB Centre</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Clinical Status */}
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900">Clinical Triage</h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">X-Ray Suspected</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["all", "Yes", "No"].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => updateFilter("suspected", opt)}
                            className={cn(
                              "py-2 px-3 rounded-lg text-xs font-bold transition-all",
                              stagedFilters.suspected === opt
                                ? "bg-amber-100 text-amber-700 ring-2 ring-amber-500/30"
                                : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            {opt === "all" ? "Any" : opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TB Diagnosed</label>
                      <div className="grid grid-cols-4 gap-2">
                        {["all", "Yes", "No", "Pending"].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => updateFilter("tbDiagnosed", opt)}
                            className={cn(
                              "py-2 px-3 rounded-lg text-xs font-bold transition-all",
                              stagedFilters.tbDiagnosed === opt
                                ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/30"
                                : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            {opt === "all" ? "Any" : opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Treatment Status</label>
                      <select
                        value={stagedFilters.treatmentStatus || "all"}
                        onChange={(e) => updateFilter("treatmentStatus", e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-white transition-all"
                      >
                        <option value="all">Any Status</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                        <option value="Defaulted">Defaulted</option>
                        <option value="Died">Died</option>
                        <option value="Not Started">Not Started</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 z-20 px-6 py-5 bg-white/90 backdrop-blur-md border-t border-slate-100">
                <div className="flex gap-3">
                  <button
                    onClick={handleClear}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:bg-slate-800 hover:scale-[1.02] transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
