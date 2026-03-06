'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  X, 
  MapPin, 
  Building2, 
  Activity, 
  Calendar,
  TriangleAlert,
  ChevronDown
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

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

interface AdvancedFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  states: string[];
  districts: string[];
  facilityTypes: string[];
  isOpen: boolean;
  onToggle: () => void;
}

export function AdvancedFilterBar({
  filters,
  onFilterChange,
  states,
  districts,
  facilityTypes,
  isOpen,
  onToggle
}: AdvancedFilterBarProps) {
  const updateFilter = (key: keyof FilterState, value: any) => {
    // Convert "all-*" values back to empty strings for filtering logic
    const filterValue = value?.startsWith?.('all-') ? '' : value;
    const newFilters = { ...filters, [key]: filterValue };
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
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
    onFilterChange(clearedFilters);
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => 
    key !== 'overdueOnly' ? value && value !== '' : value === true
  ).length;

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          onClick={onToggle}
          variant="outline"
          className={`transition-all duration-300 border-2 ${
            isOpen 
              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-md' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium"
            >
              {activeFilterCount}
            </motion.span>
          )}
          <ChevronDown className={`h-4 w-4 ml-2 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </Button>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <Card className="bg-gradient-to-br from-slate-50/80 to-white border-slate-200/60 shadow-lg backdrop-blur-sm">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Advanced Filters</h3>
                    <p className="text-sm text-slate-500 mt-1">Refine your patient data view</p>
                  </div>
                  <Button
                    onClick={clearAllFilters}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
                  >
                    <X className="h-5 w-5 mr-1" />
                    Clear All
                  </Button>
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Location */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-slate-500" />
                      <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Location</h4>
                    </div>
                    
                    <Select value={filters.state || 'all-states'} onValueChange={(value) => updateFilter('state', value)}>
                      <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-states">All States</SelectItem>
                        {states.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filters.district || 'all-districts'} onValueChange={(value) => updateFilter('district', value)}>
                      <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                        <SelectValue placeholder="Select District" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-districts">All Districts</SelectItem>
                        {districts.map(district => (
                          <SelectItem key={district} value={district}>{district}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Facility & Phase */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Facility & Phase</h4>
                    </div>
                    
                    <Select value={filters.facilityType || 'all-facility-types'} onValueChange={(value) => updateFilter('facilityType', value)}>
                      <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                        <SelectValue placeholder="Facility Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-facility-types">All Facility Types</SelectItem>
                        {facilityTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filters.phase || 'all-phases'} onValueChange={(value) => updateFilter('phase', value)}>
                      <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                        <SelectValue placeholder="Current Phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-phases">All Phases</SelectItem>
                        <SelectItem value="Screening">Screening</SelectItem>
                        <SelectItem value="Sputum Test">Sputum Test</SelectItem>
                        <SelectItem value="Diagnosis">Diagnosis</SelectItem>
                        <SelectItem value="ATT Initiation">ATT Initiation</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Medical Status */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="h-4 w-4 text-slate-500" />
                      <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Medical Status</h4>
                    </div>
                    
                    <Select value={filters.tbDiagnosed || 'all-tb-status'} onValueChange={(value) => updateFilter('tbDiagnosed', value)}>
                      <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                        <SelectValue placeholder="TB Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-tb-status">TB Status - All</SelectItem>
                        <SelectItem value="Y">TB Positive</SelectItem>
                        <SelectItem value="N">TB Negative</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.hivStatus || 'all-hiv-status'} onValueChange={(value) => updateFilter('hivStatus', value)}>
                      <SelectTrigger className="bg-white border-slate-200 hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200">
                        <SelectValue placeholder="HIV Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-hiv-status">HIV Status - All</SelectItem>
                        <SelectItem value="Positive">HIV Positive</SelectItem>
                        <SelectItem value="Negative">HIV Negative</SelectItem>
                        <SelectItem value="Unknown">HIV Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase">Screening Date Range</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => updateFilter('dateFrom', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                        />
                        <label className="absolute -top-2 left-3 px-1 bg-white text-xs text-slate-500 font-medium">
                          From Date
                        </label>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => updateFilter('dateTo', e.target.value)}
                          min={filters.dateFrom || undefined}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                        />
                        <label className="absolute -top-2 left-3 px-1 bg-white text-xs text-slate-500 font-medium">
                          To Date
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overdue Toggle */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <TriangleAlert className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-amber-900">SLA Breach Alert</h4>
                          <p className="text-xs text-amber-700 mt-1">
                            Show overdue cases only (30+ days without referral)
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={filters.overdueOnly}
                        onCheckedChange={(checked) => updateFilter('overdueOnly', checked)}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}