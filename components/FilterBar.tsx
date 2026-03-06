'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  states: string[];
  districts: string[];
  facilityTypes: string[];
}

export interface FilterState {
  facilityType: string;
  state: string;
  district: string;
  phase: string;
  overdueOnly: boolean;
  tbDiagnosed: string;
  hivStatus: string;
  dateFrom: string;
  dateTo: string;
}

const PHASES = ['All', 'Screening', 'Sputum Test', 'Diagnosis', 'ATT Initiation', 'Closed'];
const FACILITY_TYPES = ['All', 'Prison', 'Other Closed Setting', 'JH-CCI', 'DDRC'];

export function FilterBar({ onFilterChange, states, districts, facilityTypes }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    facilityType: '',
    state: '',
    district: '',
    phase: '',
    overdueOnly: false,
    tbDiagnosed: '',
    hivStatus: '',
    dateFrom: '',
    dateTo: ''
  });

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      facilityType: '',
      state: '',
      district: '',
      phase: '',
      overdueOnly: false,
      tbDiagnosed: '',
      hivStatus: '',
      dateFrom: '',
      dateTo: ''
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== '').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </Button>
        
        {activeFilterCount > 0 && (
          <Button onClick={clearFilters} variant="ghost" size="sm" className="gap-2">
            <X className="w-4 h-4" />
            Clear All
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gray-50/50 border border-gray-200 rounded-xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Facility Type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Facility Type
                  </label>
                  <select
                    value={filters.facilityType}
                    onChange={(e) => updateFilter('facilityType', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {FACILITY_TYPES.map(type => (
                      <option key={type} value={type === 'All' ? '' : type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    State
                  </label>
                  <select
                    value={filters.state}
                    onChange={(e) => updateFilter('state', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All States</option>
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    District
                  </label>
                  <select
                    value={filters.district}
                    onChange={(e) => updateFilter('district', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All Districts</option>
                    {districts.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>

                {/* Phase */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Current Phase
                  </label>
                  <select
                    value={filters.phase}
                    onChange={(e) => updateFilter('phase', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {PHASES.map(phase => (
                      <option key={phase} value={phase === 'All' ? '' : phase}>{phase}</option>
                    ))}
                  </select>
                </div>

                {/* TB Status */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    TB Status
                  </label>
                  <select
                    value={filters.tbDiagnosed}
                    onChange={(e) => updateFilter('tbDiagnosed', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All</option>
                    <option value="Y">TB Positive</option>
                    <option value="N">TB Negative</option>
                  </select>
                </div>

                {/* HIV Status */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    HIV Status
                  </label>
                  <select
                    value={filters.hivStatus}
                    onChange={(e) => updateFilter('hivStatus', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All</option>
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
              </div>
              
              {/* Date Range Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                    min={filters.dateFrom || undefined}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Overdue Toggle */}
              <div className="pt-4 border-t border-gray-200">
                <label className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.overdueOnly}
                    onChange={(e) => updateFilter('overdueOnly', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-900 font-medium">Show overdue cases only (30+ days without referral)</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
